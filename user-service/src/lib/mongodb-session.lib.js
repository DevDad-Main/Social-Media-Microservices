import mongoose from "mongoose";
import { logger } from "devdad-express-utils";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const runInTransaction = async (operations, options = {}) => {
  const { maxRetries = MAX_RETRIES, retryDelay = RETRY_DELAY_MS } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const result = await operations(session);

      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();

      if (attempt === maxRetries) {
        logger.error(`Transaction failed after ${maxRetries} attempts:`, {
          error: error.message,
        });
        throw error;
      }

      if (
        error.errorLabels?.includes("TransientTransactionError") ||
        error.errorLabels?.includes("UnknownTransactionCommitResult")
      ) {
        logger.warn(`Transaction attempt ${attempt} failed, retrying...`, {
          error: error.message,
        });
        await sleep(retryDelay * attempt);
        continue;
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }
};

export const withSession = async (operations) => {
  const session = await mongoose.startSession();

  try {
    return await operations(session);
  } finally {
    await session.endSession();
  }
};

export const executeWithRetry = async (operation, options = {}) => {
  const { maxRetries = MAX_RETRIES, retryDelay = RETRY_DELAY_MS } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      if (
        error.name === "WriteConflict" ||
        error.errorLabels?.includes("TransientTransactionError")
      ) {
        await sleep(retryDelay * attempt);
        continue;
      }

      throw error;
    }
  }
};

