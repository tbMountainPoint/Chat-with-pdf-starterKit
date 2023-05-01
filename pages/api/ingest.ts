import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PineconeStore } from 'langchain/vectorstores';
import { fileConsumer, formidablePromise } from '@/utils/formidable';
import { createPineconeIndex } from '@/utils/pinecone-client';
import { PINECONE_NAME_SPACE } from '@/config/pinecone';
import extractTextFromFile from '@/utils/extractTextFromFiles';

const formidableConfig = {
  keepExtensions: true,
  maxFileSize: 10_000_000, // 10MB
  maxFieldsSize: 10_000_000, // 10MB
  maxFields: 7,
  allowEmptyFiles: false,
  multiples: true, // if input uses HTML5 multiple attribute, the 'files' array will contain multiple files. Same as the fields.
};

const endBuffers: {
  [filename: string]: Buffer;
} = {};

// Disable the default body parser to handle file uploads
export const config = { api: { bodyParser: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { fields, files } = await formidablePromise(req, {
      ...formidableConfig,
      // @ts-ignore
      fileWriteStreamHandler: (file: any) => fileConsumer(file, endBuffers),
    });

    console.log('fields', fields);

    function extractValue(value: any) {
      if (Array.isArray(value)) {
        return value[0];
      }
      return value;
    }

    const openaiApiKey = extractValue(fields['openai-api-key']);
    const pineconeEnvironment = extractValue(fields['pinecone-environment']);
    const pineconeIndex = extractValue(fields['pinecone-index']);
    const pineconeApiKey = extractValue(fields['pinecone-api-key']);

    const docs = await Promise.all(
      Object.values(files).map(async (fileObj: any) => {
        const fileData = endBuffers[fileObj.newFilename];
        console.log('fileobj', fileObj);

        const rawDocs = await extractTextFromFile({
          fileData: fileData,
          filetype: fileObj.mimetype,
          filename: fileObj.originalFilename ?? '',
        });
        // console.log(rawDocs);

        const textSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });
        return await textSplitter.splitDocuments(rawDocs);
      }),
    );
    const flatDocs = docs.flat();

    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: openaiApiKey,
    });

    const index = await createPineconeIndex({
      pineconeApiKey: pineconeApiKey,
      pineconeEnvironment: pineconeEnvironment,
      pineconeIndexName: pineconeIndex,
    });

    await PineconeStore.fromDocuments(flatDocs, embeddings, {
      pineconeIndex: index,
      namespace: PINECONE_NAME_SPACE,
      textKey: 'text',
    });

    res.status(200).json({ message: 'successfully ingested' });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unknown error.' });
  } finally {
    res.end();
  }
}
