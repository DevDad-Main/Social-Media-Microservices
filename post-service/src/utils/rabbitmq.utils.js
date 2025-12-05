import amqp from "amqplib";
import { logger } from "devdad-express-utils";

let connection = null;
let channel = null;
const EXCHANGE_NAME = "SocialMediaMicroservice_events";

export async function connectToRabbitMQ() {
  try {
    if (connection) {
      return;
    }

    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ");

    return channel;
  } catch (error) {
    logger.error("Error connecting to RabbitMQ: ", error);
  }
}
