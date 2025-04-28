import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  role: MessageRole;
  content: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly ollamaApiUrl: string;
  private readonly ollamaModel: string;

  constructor() {
    this.ollamaApiUrl = process.env.OLLAMA_API_URL || 'http://ollama:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3';
    this.logger.log(`LLM Service initialized with model: ${this.ollamaModel}`);
  }

  async generateResponse(
    documentContext: string,
    messages: Message[],
  ): Promise<string> {
    try {

      const systemPrompt = `You are a helpful assistant analyzing a document. 
      Here is the document content that you should reference when answering questions:
      
      ${documentContext}
      
      When answering, refer to specific parts of the document if relevant. 
      If the question cannot be answered based on the document, politely explain that 
      the information is not available in the document.`;

      let prompt = systemPrompt + "\n\n";
      
      for (const message of messages) {
        const rolePrefix = message.role === 'user' ? 'User: ' : 'Assistant: ';
        prompt += `${rolePrefix}${message.content}\n`;
      }
      
      prompt += "Assistant: ";

      this.logger.debug(`Sending request to Ollama with model: ${this.ollamaModel}`);
      
      const response = await axios.post<{ response: string }>(`${this.ollamaApiUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
      });

      return response.data.response;
    } catch (error) {
      this.logger.error(`Error generating LLM response: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}
