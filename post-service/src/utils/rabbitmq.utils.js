import amqp from "amqplib";
import { AppError, logger } from "devdad-express-utils";

const EXCHANGE_NAME = "SocialMediaMicroservice_events";

let connection = null;
let channel = null;

async function connectionToRabbitMQ(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      if (connection) return connection;
      connection = await amqp.connect(process.env.RABBITMQ_URL);
      return connection;
    } catch (error) {
      logger.warn(`RabbitMQ not ready, retrying ${i + 1}/${retries}...`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  throw new AppError("Failed to connect to RabbitMQ after retries");
}

export async function initializeRabbitMQ() {
  try {
    const connect = await connectionToRabbitMQ();
    if (!connect) {
      throw new AppError("Failed to connect to RabbitMQ");
    }

    channel = await connect.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ");

    return channel;
  } catch (error) {
    logger.error("Error connecting to RabbitMQ: ", error);
  }
}

export async function publishEvent(routingKey, message) {
  if (!channel) {
    await initializeRabbitMQ();
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message)),
  );
  logger.info(`Published event to ${routingKey}`);
}
