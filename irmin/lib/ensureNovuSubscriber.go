package lib

import (
	"context"
	"irmin-api/db"
	"irmin-api/utils"

	novugo "github.com/novuhq/novu-go"
	"github.com/novuhq/novu-go/models/components"
)

// EnsureNovuSubscriber ensures that the user is a subscriber in Novu
// It creates the subscriber if it doesn't exist, or updates it if it does.
func EnsureNovuSubscriber(
	ctx context.Context,
	sqidManager *utils.SQIDManager,
	env *utils.CoreAPIEnv,
	locale string,
	user *db.User,
) (*components.SubscriberResponseDto, error) {
	novuSecretKey := env.NovuSecretKey

	// Create a sqid for the user
	userSqid, err := sqidManager.Encode("users", uint64(user.ID))
	if err != nil {
		return nil, err
	}

	// Create a new Novu client
	s := novugo.New(
		novugo.WithSecurity(novuSecretKey),
	)

	var novuSubscriber *components.SubscriberResponseDto

	// Check if the subscriber already exists
	subscriber, err := s.Subscribers.Retrieve(ctx, userSqid, nil)
	if err != nil || subscriber == nil || subscriber.SubscriberResponseDto == nil {
		// Create the subscriber
		createSubscriberResponse, createSubscriberErr := s.Subscribers.Create(
			ctx,
			components.CreateSubscriberRequestDto{
				SubscriberID: userSqid,
				Email:        &user.Email,
				FirstName:    &user.FirstName,
				LastName:     &user.LastName,
				Phone:        &user.Phone,
				Avatar:       &user.ProfilePicture,
				Locale:       &locale,
			},
			nil,
		)
		if createSubscriberErr != nil {
			return nil, createSubscriberErr
		}
		novuSubscriber = createSubscriberResponse.SubscriberResponseDto
	} else {
		// Update the subscriber
		updateSubscriberResponse, updateSubscriberErr := s.Subscribers.Patch(ctx, userSqid, components.PatchSubscriberRequestDto{
			Email:     &user.Email,
			FirstName: &user.FirstName,
			LastName:  &user.LastName,
			Phone:     &user.Phone,
			Avatar:    &user.ProfilePicture,
			Locale:    &locale,
		}, nil)
		if updateSubscriberErr != nil {
			return nil, updateSubscriberErr
		}
		novuSubscriber = updateSubscriberResponse.SubscriberResponseDto
	}

	// Return the subscriber
	return novuSubscriber, nil
}
