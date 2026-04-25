package engine

func ShouldDeletePresignedPushObjectForTest(jobErr error) bool {
	return shouldDeletePresignedPushObject(jobErr)
}
