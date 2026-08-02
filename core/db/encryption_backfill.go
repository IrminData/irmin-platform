package db

import (
	"context"
	"fmt"
	"log/slog"
)

// backfillBatchSize controls how many connections are processed per batch
// during the encryption backfill. Kept small so a pass runs in bounded time
// even on deployments with many connections.
const backfillBatchSize = 200

// ReencryptConnectionDetails walks every Connection and re-saves its Details
// field so the encrypted_json serializer rewrites each row using the active
// key. The operation is idempotent: the serializer decrypts on read and
// re-encrypts on write, so running this repeatedly is safe. Legacy plaintext
// rows are upgraded on their first pass; already-encrypted rows get a fresh
// nonce (and, after a rotation, the new key ID).
//
// Returns the number of rows touched and any error encountered. Errors on a
// single row are logged and skipped so one bad row doesn't block the rest.
func (d *Database) ReencryptConnectionDetails(ctx context.Context, logger *slog.Logger) (int, error) {
	total := 0
	lastID := uint(0)
	for {
		var batch []Connection
		err := d.WithContext(ctx).
			Where("id > ?", lastID).
			Order("id ASC").
			Limit(backfillBatchSize).
			Find(&batch).Error
		if err != nil {
			return total, fmt.Errorf("fetch connections batch: %w", err)
		}
		if len(batch) == 0 {
			return total, nil
		}
		for i := range batch {
			conn := &batch[i]
			// Advance the cursor first, regardless of what happens below.
			// Skipping this on failure would cause the outer loop to re-fetch
			// the same rows forever once they're the only ones in the tail.
			lastID = conn.ID

			// Skip connections whose Details column is SQL NULL. Writing a
			// serialized value here would turn NULL into a JSON 'null' or an
			// empty object — we have no reason to touch these rows.
			if conn.Details == nil {
				continue
			}

			// Scope the write to the details column only — this routes
			// through the encrypted_json serializer and avoids any risk of
			// cascading to preloaded associations. The read path above
			// already decrypted, so this is a plaintext → ciphertext
			// round-trip.
			updateErr := d.WithContext(ctx).
				Model(&Connection{}).
				Where("id = ?", conn.ID).
				Update("details", conn.Details).Error
			if updateErr != nil {
				logger.WarnContext(
					ctx,
					"encryption backfill: failed to rewrite connection",
					"connection_id",
					conn.ID,
					"error",
					updateErr,
				)
				continue
			}
			total++
		}
	}
}
