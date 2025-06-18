import axios, { AxiosResponse } from 'axios';
import { retrieveEnvVariable, logger } from './';

const token: string = retrieveEnvVariable('TG_BOT_TOKEN', logger);
const chatId: string = retrieveEnvVariable('TG_CHAT_ID', logger);
// const message: string = 'Hello, this is a message from the bot!';

interface TelegramResponse {
  ok: boolean;
  result: {
    message_id: number;
    chat: {
      id: number;
      title: string;
      type: string;
    };
    date: number;
    text: string;
  };
}

export const sendMessage = async (message: string): Promise<void> => {
  const url: string = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response: AxiosResponse<TelegramResponse> = await axios.post(url, {
      chat_id: chatId,
      text: message,
    });

    if (response.data.ok) {
      //   console.log('Message sent successfully:', response.data.result);
    } else {
      console.error('Failed to send message:', response.data);
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

export const obfuscateString = (input: string): string => {
  if (input.length <= 8) {
    return input; // If the string is too short, return it as is
  }

  const firstPart = input.substring(0, 4); // First 4 characters
  const lastPart = input.substring(input.length - 4); // Last 4 characters

  return `${firstPart}****${lastPart}`;
};
