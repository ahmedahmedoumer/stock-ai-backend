import { BedrockEmbeddings, ChatBedrockConverse } from '@langchain/aws';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from '@langchain/google-genai';

export function llmProvider() {
  return (process.env.LLM_PROVIDER ?? 'gemini').trim().toLowerCase();
}

export function embeddingProvider() {
  return (process.env.EMBEDDING_PROVIDER ?? llmProvider()).trim().toLowerCase();
}

export function embeddingDimensions() {
  if (process.env.EMBEDDING_DIMENSIONS) {
    return Number(process.env.EMBEDDING_DIMENSIONS);
  }
  return embeddingProvider() === 'bedrock' ? 1024 : 768;
}

export function supportDocsTable() {
  if (process.env.SUPPORT_DOCS_TABLE) return process.env.SUPPORT_DOCS_TABLE;
  return embeddingProvider() === 'bedrock'
    ? 'support_docs_bedrock'
    : 'support_docs';
}

function awsRegion() {
  return (
    process.env.BEDROCK_AWS_REGION ??
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    'us-east-1'
  );
}

function awsCredentials() {
  const accessKeyId =
    process.env.BEDROCK_AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.BEDROCK_AWS_SECRET_ACCESS_KEY ??
    process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken =
    process.env.BEDROCK_AWS_SESSION_TOKEN ?? process.env.AWS_SESSION_TOKEN;
  if (!accessKeyId || !secretAccessKey) return undefined;
  return { accessKeyId, secretAccessKey, sessionToken };
}

export function createChatModel(): BaseChatModel {
  if (llmProvider() === 'bedrock') {
    return new ChatBedrockConverse({
      model: process.env.BEDROCK_CHAT_MODEL ?? 'amazon.nova-lite-v1:0',
      region: awsRegion(),
      temperature: 0.2,
      credentials: awsCredentials(),
    });
  }

  return new ChatGoogleGenerativeAI({
    model: 'gemini-flash-latest',
    temperature: 0.2,
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

export function createEmbeddings(): Embeddings {
  if (embeddingProvider() === 'bedrock') {
    return new BedrockEmbeddings({
      model:
        process.env.BEDROCK_EMBEDDING_MODEL ?? 'amazon.titan-embed-text-v2:0',
      region: awsRegion(),
      credentials: awsCredentials(),
      dimensions: embeddingDimensions(),
    });
  }

  return new GoogleGenerativeAIEmbeddings({
    model: 'gemini-embedding-001',
    outputDimensionality: embeddingDimensions(),
    apiKey: process.env.GOOGLE_API_KEY,
  });
}
