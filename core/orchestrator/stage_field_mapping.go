package orchestrator

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"maps"
	"slices"
	"sort"
)

// handleFieldMappingStage handles the execution of a field_mapping stage in the pipeline.
// It applies field mappings (renames, type casts, file routing, JSON unwrapping)
// to the files from previous stage results using the data engine.
func (o *Orchestrator) handleFieldMappingStage(
	ctx context.Context,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before field mapping: %w", ctx.Err())
	}

	if len(stage.FieldMappingMappings) == 0 {
		logs = append(logs, "No field mappings configured")
		return logs, errors.New("no field mappings configured for field_mapping stage")
	}

	mode := validationModeAll
	if stage.FieldMappingMode != nil {
		mode = *stage.FieldMappingMode
	}

	if mode != validationModeSingle && mode != validationModeAll {
		return logs, fmt.Errorf("invalid field_mapping_mode: %q (must be 'single' or 'all')", mode)
	}

	logs = append(logs, fmt.Sprintf(
		"Starting field mapping (mappings: %d, mode: %s)",
		len(stage.FieldMappingMappings), mode,
	))

	// Determine which files to process and which pass through
	filesToProcess, passThrough, filterLogs, filterErr := filterFilesForFieldMapping(mode, stage, previousStageResults)
	logs = append(logs, filterLogs...)
	if filterErr != nil {
		return logs, filterErr
	}

	// Apply field mappings using the engine
	mappedFiles, err := o.dataEngine.ProcessFieldMappings(ctx, filesToProcess, stage.FieldMappingMappings)
	if err != nil {
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Workflow execution cancelled during field mapping: %v", ctx.Err()))
			return logs, ctx.Err()
		}
		logs = append(logs, fmt.Sprintf("Field mapping failed: %v", err))
		return logs, fmt.Errorf("field mapping failed: %w", err)
	}

	// Build final results: pass-through files + mapped files
	results := make(map[string][]byte)
	maps.Copy(results, passThrough)
	maps.Copy(results, mappedFiles)

	// Apply file rename if specified (single mode only)
	renameLogs := applyFieldMappingRename(mode, stage, results, mappedFiles)
	logs = append(logs, renameLogs...)

	// Update previous stage results in place — the orchestrator passes this map
	// by reference between stages, so mutating it here propagates results to the
	// next stage. All intermediate maps (filesToProcess, passThrough, results) are
	// separate copies, so only this final assignment writes back.
	// Always replace because the results map contains the complete output
	// (pass-through files + mapped files).
	clear(previousStageResults)
	maps.Copy(previousStageResults, results)

	logs = append(logs, fmt.Sprintf("Field mapping complete: %d file(s) produced", len(results)))
	for fileName := range results {
		logs = append(logs, fmt.Sprintf("  - %s", fileName))
	}

	return logs, nil
}

// filterFilesForFieldMapping separates files into those to process and pass-through
// based on the field mapping mode. Always returns new maps to avoid shared mutation.
func filterFilesForFieldMapping(
	mode string,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) (map[string][]byte, map[string][]byte, []string, error) {
	passThrough := make(map[string][]byte)

	if mode != validationModeSingle || stage.FieldMappingTargetName == nil {
		// Return a copy of the map to avoid shared mutation
		filesToProcess := make(map[string][]byte, len(previousStageResults))
		maps.Copy(filesToProcess, previousStageResults)
		return filesToProcess, passThrough, nil, nil
	}

	targetName := *stage.FieldMappingTargetName
	targetContent, exists := previousStageResults[targetName]
	if !exists {
		return nil, nil,
			[]string{fmt.Sprintf("Target file not found: %s", targetName)},
			fmt.Errorf("target file %q not found in previous stage results", targetName)
	}

	for k, v := range previousStageResults {
		if k != targetName {
			passThrough[k] = v
		}
	}

	return map[string][]byte{targetName: targetContent}, passThrough, nil, nil
}

// applyFieldMappingRename renames the primary destination output in single mode.
// The remainder file (unmapped fields keyed by original source path) keeps its name.
func applyFieldMappingRename(
	mode string,
	stage *db.PipelineStage,
	results map[string][]byte,
	mappedFiles map[string][]byte,
) []string {
	if mode != validationModeSingle || stage.FieldMappingOutputName == nil || *stage.FieldMappingOutputName == "" {
		return nil
	}

	outputName := *stage.FieldMappingOutputName
	var logs []string

	// Collect destination paths (excluding remainder file) and sort for deterministic selection
	destPaths := slices.Collect(maps.Keys(mappedFiles))
	sort.Strings(destPaths)

	for _, destPath := range destPaths {
		if stage.FieldMappingTargetName != nil && destPath == *stage.FieldMappingTargetName {
			continue // This is the remainder file, not a new destination
		}
		delete(results, destPath)
		results[outputName] = mappedFiles[destPath]
		logs = append(logs, fmt.Sprintf("  - Renamed output file: %s → %s", destPath, outputName))
		return logs // Only rename the first (primary) destination
	}

	// If no explicit destination was found (all fields mapped to same file), rename it
	if stage.FieldMappingTargetName != nil {
		targetName := *stage.FieldMappingTargetName
		if content, ok := results[targetName]; ok {
			delete(results, targetName)
			results[outputName] = content
			logs = append(logs, fmt.Sprintf("  - Renamed output file: %s → %s", targetName, outputName))
		}
	}

	return logs
}
