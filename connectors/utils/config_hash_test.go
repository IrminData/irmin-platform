package utils_test

import (
	"encoding/json"
	"irmin-connectors/utils"
	"testing"

	"github.com/zeebo/assert"
)

func TestHashConfigMap(t *testing.T) {
	t.Run("same config different order produces same hash", func(t *testing.T) {
		config1 := map[string]string{
			"host":     "localhost",
			"port":     "5432",
			"database": "mydb",
			"user":     "admin",
		}

		config2 := map[string]string{
			"user":     "admin",
			"database": "mydb",
			"port":     "5432",
			"host":     "localhost",
		}

		hash1, err := utils.HashConfigMap(config1)
		assert.NoError(t, err)

		hash2, err := utils.HashConfigMap(config2)
		assert.NoError(t, err)

		assert.Equal(t, hash1, hash2)
	})

	t.Run("different config produces different hash", func(t *testing.T) {
		config1 := map[string]string{
			"host": "localhost",
			"port": "5432",
		}

		config2 := map[string]string{
			"host": "localhost",
			"port": "5433",
		}

		hash1, err := utils.HashConfigMap(config1)
		assert.NoError(t, err)

		hash2, err := utils.HashConfigMap(config2)
		assert.NoError(t, err)

		assert.That(t, hash1 != hash2)
	})

	t.Run("nil map produces hash", func(t *testing.T) {
		hash, err := utils.HashConfigMap(nil)
		assert.NoError(t, err)
		assert.That(t, hash != "")
	})

	t.Run("empty map produces same hash as nil", func(t *testing.T) {
		hash1, err := utils.HashConfigMap(nil)
		assert.NoError(t, err)

		hash2, err := utils.HashConfigMap(make(map[string]string))
		assert.NoError(t, err)

		assert.Equal(t, hash1, hash2)
	})
}

func TestHashJSONFields(t *testing.T) {
	t.Run("same JSON fields different order produces same hash", func(t *testing.T) {
		details1 := map[string]string{"host": "localhost", "port": "5432"}
		settings1 := map[string]string{"timeout": "30", "retry": "3"}

		details2 := map[string]string{"port": "5432", "host": "localhost"}
		settings2 := map[string]string{"retry": "3", "timeout": "30"}

		details1JSON, _ := json.Marshal(details1)
		settings1JSON, _ := json.Marshal(settings1)

		details2JSON, _ := json.Marshal(details2)
		settings2JSON, _ := json.Marshal(settings2)

		hash1, err := utils.HashJSONFields(details1JSON, settings1JSON)
		assert.NoError(t, err)

		hash2, err := utils.HashJSONFields(details2JSON, settings2JSON)
		assert.NoError(t, err)

		assert.Equal(t, hash1, hash2)
	})

	t.Run("different JSON fields produce different hash", func(t *testing.T) {
		details1 := map[string]string{"host": "localhost", "port": "5432"}
		settings1 := map[string]string{"timeout": "30"}

		details2 := map[string]string{"host": "localhost", "port": "5433"}
		settings2 := map[string]string{"timeout": "30"}

		details1JSON, _ := json.Marshal(details1)
		settings1JSON, _ := json.Marshal(settings1)

		details2JSON, _ := json.Marshal(details2)
		settings2JSON, _ := json.Marshal(settings2)

		hash1, err := utils.HashJSONFields(details1JSON, settings1JSON)
		assert.NoError(t, err)

		hash2, err := utils.HashJSONFields(details2JSON, settings2JSON)
		assert.NoError(t, err)

		assert.That(t, hash1 != hash2)
	})

	t.Run("empty JSON produces hash", func(t *testing.T) {
		hash, err := utils.HashJSONFields([]byte("{}"), []byte("{}"))
		assert.NoError(t, err)
		assert.That(t, hash != "")
	})

	t.Run("nil bytes produce hash", func(t *testing.T) {
		hash, err := utils.HashJSONFields(nil, nil)
		assert.NoError(t, err)
		assert.That(t, hash != "")
	})

	t.Run("details and settings keys don't collide", func(t *testing.T) {
		// If we have the same key in both details and settings, they should be distinct
		details1 := map[string]string{"key": "value1"}
		settings1 := map[string]string{"key": "value2"}

		details2 := map[string]string{"key": "value2"}
		settings2 := map[string]string{"key": "value1"}

		details1JSON, _ := json.Marshal(details1)
		settings1JSON, _ := json.Marshal(settings1)

		details2JSON, _ := json.Marshal(details2)
		settings2JSON, _ := json.Marshal(settings2)

		hash1, err := utils.HashJSONFields(details1JSON, settings1JSON)
		assert.NoError(t, err)

		hash2, err := utils.HashJSONFields(details2JSON, settings2JSON)
		assert.NoError(t, err)

		assert.That(t, hash1 != hash2)
	})
}
