// import jwt from "jsonwebtoken";
// import * as TradingService from "../services/trading.service.js";
// import { MAX_TRADE_QUANTITY } from "../utils/constants.js";

// function validateTradeInput(symbol, quantity) {
//   if (!symbol || typeof symbol !== 'string') {
//     throw new Error("Valid symbol is required");
//   }
//   if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
//     throw new Error("Quantity must be a positive number");
//   }
//   if (quantity > MAX_TRADE_QUANTITY) {
//     throw new Error(`Quantity cannot exceed ${MAX_TRADE_QUANTITY}`);
//   }
// }

// export default (io, priceEngine) => {
//   io.on('connection', (socket) => {
//     socket.on('buy', async (data, callback) => {
//       try {
//         const { token, symbol, quantity } = data;
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         validateTradeInput(symbol, quantity);
//         const priceData = priceEngine.getPrice(symbol);
//         const result = await TradingService.buyAsset(decoded.id, symbol, quantity, priceData.last);
//         if (callback) callback(result);
//       } catch (error) {
//         if (callback) callback({ error: error.message });
//       }
//     });

//     socket.on('sell', async (data, callback) => {
//       try {
//         const { token, symbol, quantity } = data;
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         validateTradeInput(symbol, quantity);
//         const priceData = priceEngine.getPrice(symbol);
//         const result = await TradingService.sellAsset(decoded.id, symbol, quantity, priceData.last);
//         if (callback) callback(result);
//       } catch (error) {
//         if (callback) callback({ error: error.message });
//       }
//     });

//     socket.on('getPortfolio', async (data, callback) => {
//       try {
//         const { token } = data;
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const result = await TradingService.getPortfolio(decoded.id);
//         if (callback) callback(result);
//       } catch (error) {
//         if (callback) callback({ error: error.message });
//       }
//     });
//   });
// };