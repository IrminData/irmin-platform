package main

import "testing"

func TestValidatePrelaunchAIResetAcknowledgement(t *testing.T) {
	t.Parallel()

	if err := validatePrelaunchAIResetAcknowledgement(""); err == nil {
		t.Fatal("expected missing acknowledgement to be rejected")
	}
	if err := validatePrelaunchAIResetAcknowledgement("RESET_IRMIN"); err == nil {
		t.Fatal("expected partial acknowledgement to be rejected")
	}
	if err := validatePrelaunchAIResetAcknowledgement(prelaunchAIResetAcknowledgement); err != nil {
		t.Fatalf("expected exact acknowledgement to pass: %v", err)
	}
}
