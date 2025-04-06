/* eslint-disable no-console */

import { text } from "node:stream/consumers";
import { createGunzip } from "node:zlib";
import { Readable } from "stream";

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const EmptySingleMatchResultFactory = match => ({
  scores: [],
  match,
  results: [],
  matchResults: [],
});
export const EmptyMatchResultsFactory = () => ({
  scores: [],
  matches: [],
  results: [],
  matchResults: [],
});

export const _fetchPSS3ObjectJSON = async (objectKey: string, noGZip = false) => {
  try {
    const s3Client = new S3Client({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.PS_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.PS_S3_SECRET_ACCESS_KEY!,
      },
    });

    const s3Response = await s3Client.send(
      new GetObjectCommand({
        Bucket: "ps-scores",
        Key: objectKey,
      }),
    );

    const bodyStream = s3Response.Body;
    if (!bodyStream) {
      return null;
    }

    // try gzip first, if that crashes - refetch and don't decompress
    // TODO: rewrite to re-use once fetched data for both (gz and not) pathways
    // (refetching for now, because node closes streams and makes re-use challenging)
    if (!noGZip) {
      try {
        const gz = createGunzip();
        const body = (bodyStream as Readable).pipe(gz);
        const bodyString = await text(body);
        return JSON.parse(bodyString);
      } catch (e) {
        return _fetchPSS3ObjectJSON(objectKey, true);
      }
    } else {
      const bodyString = await bodyStream.transformToString();
      return JSON.parse(bodyString);
    }
  } catch (e) {
    console.error(
      `fetchPSS3ObjectJSON failed: ${objectKey}; ${(e as Error)?.message || ""}`,
    );
    return null;
  }
};

export const fetchPS = async (uuid, { skipResults = false } = {}) => {
  try {
    const [matchDef, scores, results] = await Promise.all([
      _fetchPSS3ObjectJSON(`production/${uuid}/match_def.json`),
      _fetchPSS3ObjectJSON(`production/${uuid}/match_scores.json`),
      skipResults
        ? Promise.resolve(null)
        : _fetchPSS3ObjectJSON(`production/${uuid}/results.json`),
    ]);

    return { matchDef, scores, results };
  } catch (e) {}

  return {};
};
