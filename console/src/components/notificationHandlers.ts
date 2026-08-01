import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Handles primary action clicks on Novu notifications.
 *
 * Navigates to the redirect URL or the invite URL from the notification data.
 *
 * @param notification - The Novu notification object
 * @param router - The Next.js app router instance
 */
export function handleNotificationPrimaryAction(
  notification: { redirect?: { url?: string }; data?: Record<string, unknown> },
  router: AppRouterInstance
): void {
  const url =
    notification.redirect?.url ??
    (notification.data?.inviteUrl as string | undefined);
  if (url) router.push(url);
}

/**
 * Handles secondary action clicks on Novu notifications.
 *
 * Marks the notification as read.
 *
 * @param notification - The Novu notification object with a read method
 */
export function handleNotificationSecondaryAction(notification: {
  read: () => Promise<unknown>;
}): void {
  void notification.read();
}
