package examples

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/services"
	"os"
)

func TestVersioningAndObjects(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	branchService := services.NewBranchService(apiClient)
	commitService := services.NewCommitService(apiClient)
	tagService := services.NewTagService(apiClient)
	objectService := services.NewObjectService(apiClient)
	diffService := services.NewDiffService(apiClient)

	// Create a branch in the test repository
	res, err := branchService.CreateBranch("test-repository", "example-branch", "main")
	if err != nil {
		fmt.Println("Error creating branch:", err)
		return
	}
	fmt.Println(res.Message)

	// Read the contents of the Lakes.json file
	lakesPath := "./static/Lakes.json"
	lakesContent, err := os.ReadFile(lakesPath)
	if err != nil {
		fmt.Println("Error reading Lakes.json file:", err)
		return
	}

	// Read the contents of the Meteo.json file
	meteoPath := "./static/Meteo.json"
	meteoContent, err := os.ReadFile(meteoPath)
	if err != nil {
		fmt.Println("Error reading Meteo.json file:", err)
		return
	}

	// Upload static JSON file to the test repository in the example-branch
	lakes, res, err := objectService.UploadObject("test-repository", "example-branch", "/Lakes.json", "Lakes.json", map[string][]byte{"Lakes.json": lakesContent})
	if err != nil {
		fmt.Println("Error uploading object:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Uploaded object:", lakes)

	// Commit the changes on the example-branch
	res, err = commitService.CreateCommit("test-repository", "example-branch", "Add Lakes.json object")
	if err != nil {
		fmt.Println("Error creating commit:", err)
		return
	}
	fmt.Println(res.Message)

	// Upload different static JSON file to the test repository in the main branch
	meteo, res, err := objectService.UploadObject("test-repository", "main", "/Meteo.json", "Meteo.json", map[string][]byte{"Meteo.json": meteoContent})
	if err != nil {
		fmt.Println("Error uploading object:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Uploaded object:", meteo)

	// Revert the changes on the main branch
	res, err = commitService.RevertUncommittedChanges("test-repository", "main")
	if err != nil {
		fmt.Println("Error reverting changes:", err)
		return
	}
	fmt.Println(res.Message)

	// Fetch last modification to Lakes.json on the example-branch
	lastCommit, res, err := commitService.FetchLastModification("test-repository", "example-branch", "/Lakes.json")
	if err != nil {
		fmt.Println("Error fetching last modification:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Last modification to Lakes.json:", lastCommit)

	// Fetch lakes object from the example-branch
	lakes, res, err = objectService.FetchObject("test-repository", "/Lakes.json", "example-branch")
	if err != nil {
		fmt.Println("Error fetching object:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Fetched object:", lakes)

	// Fetch lakes chema from the example-branch
	lakesSchema, res, err := objectService.FetchObjectSchema("test-repository", "/Lakes.json", "example-branch")
	if err != nil {
		fmt.Println("Error fetching object schema:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Fetched object schema:", lakesSchema)

	// Get the diff between the main and example-branch
	diff, res, err := diffService.CompareRefs("test-repository", "main", "example-branch")
	if err != nil {
		fmt.Println("Error comparing refs:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Diff between main and example-branch:", diff)

	// Merge the example-branch into the main branch
	res, err = diffService.MergeRefs("test-repository", "main", "example-branch", "Merging example-branch into main", "default")
	if err != nil {
		fmt.Println("Error merging refs:", err)
		return
	}
	fmt.Println(res.Message)

	// Create a tag on the main branch
	tag, res, err := tagService.CreateTag("test-repository", "example-tag", "main")
	if err != nil {
		fmt.Println("Error creating tag:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Created tag:", tag)

	// Get objects on the main branch
	objects, res, err := objectService.FetchObjects("test-repository", "/", "main")
	if err != nil {
		fmt.Println("Error fetching objects:", err)
		return
	}
	fmt.Println(res.Message)
	for _, obj := range objects {
		fmt.Println("Fetched object:", obj.Path)
	}

	// Delete the example-branch
	res, err = branchService.DeleteBranch("test-repository", "example-branch")
	if err != nil {
		fmt.Println("Error deleting branch:", err)
		return
	}
	fmt.Println(res.Message)
}
