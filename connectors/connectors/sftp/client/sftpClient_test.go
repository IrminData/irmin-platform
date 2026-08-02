//nolint:testpackage // exercises package-private SSH verification helpers
package sftpclient

import (
	"crypto/ed25519"
	"crypto/rand"
	"testing"

	"golang.org/x/crypto/ssh"
)

func TestSetupHostKeyVerificationRequiresFingerprint(t *testing.T) {
	client, err := NewSftpClient(&ConnectionConfig{})
	if err != nil {
		t.Fatalf("NewSftpClient: %v", err)
	}

	if setupErr := client.setupHostKeyVerification(&ssh.ClientConfig{}); setupErr == nil {
		t.Fatal("expected a missing fingerprint to fail closed")
	}
}

func TestSetupHostKeyVerificationAcceptsOnlyConfiguredKey(t *testing.T) {
	trustedKey := newTestPublicKey(t)
	untrustedKey := newTestPublicKey(t)
	client, err := NewSftpClient(&ConnectionConfig{HostKeyFingerprint: ssh.FingerprintSHA256(trustedKey)})
	if err != nil {
		t.Fatalf("NewSftpClient: %v", err)
	}

	config := &ssh.ClientConfig{}
	if setupErr := client.setupHostKeyVerification(config); setupErr != nil {
		t.Fatalf("setupHostKeyVerification: %v", setupErr)
	}
	if callbackErr := config.HostKeyCallback("host", nil, trustedKey); callbackErr != nil {
		t.Fatalf("trusted key rejected: %v", callbackErr)
	}
	if callbackErr := config.HostKeyCallback("host", nil, untrustedKey); callbackErr == nil {
		t.Fatal("expected an untrusted host key to be rejected")
	}
}

func newTestPublicKey(t *testing.T) ssh.PublicKey {
	t.Helper()
	publicKey, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	key, err := ssh.NewPublicKey(publicKey)
	if err != nil {
		t.Fatalf("ssh.NewPublicKey: %v", err)
	}
	return key
}
