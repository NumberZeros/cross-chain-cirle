/**
 * TransferNotifications component
 *
 * Previously managed socket-based transfer notifications.
 * Now that we use Bridge Kit directly (which handles the entire flow in one call),
 * this component is simplified. Notifications are now handled directly in the
 * transfer store when the bridge promise resolves or rejects.
 */
export function TransferNotifications(): null {
  // No longer needed - notifications are handled in transfer.store.ts
  return null;
}
