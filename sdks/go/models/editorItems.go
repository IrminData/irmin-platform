package models

// EditorItems represents a single editor items instance.
type EditorItems struct {
	// The workspace slug the items are for
	Workspace string `json:"workspace"`
	// List of folders in the workspace
	Folders []EditorItemsFolder `json:"folders"`
	// List of files in the workspace
	Files []EditorItemsFile `json:"files"`
}

// EditorItemsFolder represents a folder in the editor items.
type EditorItemsFolder struct {
	// Slug of the workspace this folder is in
	Workspace string `json:"workspace"`
	// Name of the folder
	Name string `json:"name"`
	// Path of the folder in the editor files
	Path string `json:"path"`
	// ID of the user who owns the folder
	Owner string `json:"owner"`
	// Folder creation date
	CreatedAt string `json:"created_at"`
	// Folder update date
	UpdatedAt string `json:"updated_at"`
}

// IrminFileType represents the available file types/extensions for files on Irmin.
type IrminFileType string

const (
	IrminFileTypeJS  IrminFileType = "js"
	IrminFileTypeGo  IrminFileType = "go"
	IrminFileTypeSQL IrminFileType = "sql"
)

// IrminFileTypeWithDetails represents a detailed description of an Irmin file type.
type IrminFileTypeWithDetails struct {
	Name      string `json:"name"`
	Extension string `json:"extension"`
}

// EditorItemsFile represents a file in the editor items.
type EditorItemsFile struct {
	// Slug of the workspace this file is in
	Workspace string `json:"workspace"`
	// Name of the file
	Name string `json:"name"`
	// Path of the file in the editor files
	Path string `json:"path"`
	// Type of the file (file extension)
	Type IrminFileType `json:"type"`
	// Content of the file
	Contents string `json:"contents"`
	// Is the file a draft
	IsDraft bool `json:"is_draft"`
	// ID of the user who owns the file
	Owner string `json:"owner"`
	// File creation date
	CreatedAt string `json:"created_at"`
	// File update date
	UpdatedAt string `json:"updated_at"`
}
