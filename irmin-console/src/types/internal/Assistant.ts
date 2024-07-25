/**
 * The message type for the chat with the Irmin AI assistant
 * TODO: Needs to be removed and implemented in the API types
 * @typeParam id - Message ID
 * @typeParam text - Message text
 * @typeParam sender - Message sender, either 'user' or 'assistant'
 */
export type Message = {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
};
