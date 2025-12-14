const Order = require('../models/Order');
const { sendEmail } = require('../services/emailService');
const vnpayService = require('../services/vnpayService');

class PaymentController {
  async createVNPayPayment(req, res, next) {
    try {
      const { orderId } = req.body;

      const order = await Order.findById(orderId);


      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Allow guest orders (no userId check if order has no userId)
      if (req.user && order.userId && order.userId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }


      if (order.status !== 'pending_payment') {
        return res.status(400).json({
          success: false,
          message: 'Order is not in pending payment status'
        });
      }

      // Get IP address
      const ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress ||
        '127.0.0.1';

      // Create payment URL
      const paymentUrl = vnpayService.createPaymentUrl(
        order.orderNumber,
        order.totalAmount,
        `Thanh toan don hang ${order.orderNumber}`,
        ipAddr,
        'vn'
      );

      // Save payment info
      order.paymentInfo = {
        method: 'vnpay',
        amountUSD: order.totalAmount,
        createdAt: new Date()
      };
      await order.save();

      res.json({
        success: true,
        data: {
          paymentUrl
        }
      });
    } catch (error) {
      console.error('VNPay payment error:', error);
      next(error);
    }
  }

  // VNPay IPN (Instant Payment Notification)
  // async vnpayIPN(req, res, next) {
  //   try {
  //     // FIX: Changed vnp_Params to vnpParams for consistency
  //     let vnpParams = req.query;

  //     console.log('VNPay IPN Params:', vnpParams);

  //     const isValid = vnpayService.verifyReturnUrl(vnpParams);

  //     if (!isValid) {
  //       return res.status(200).json({
  //         RspCode: '97',
  //         Message: 'Fail checksum'
  //       });
  //     }

  //     const orderId = vnpParams['vnp_TxnRef'];
  //     const rspCode = vnpParams['vnp_ResponseCode'];
  //     const amount = vnpParams['vnp_Amount'] / 100;
  //     const transactionNo = vnpParams['vnp_TransactionNo'];
  //     const bankCode = vnpParams['vnp_BankCode'];
  //     const payDate = vnpParams['vnp_PayDate'];

  //     const order = await Order.findOne({ orderNumber: orderId });

  //     if (!order) {
  //       return res.status(200).json({
  //         RspCode: '01',
  //         Message: 'Order not found'
  //       });
  //     }

  //     if (amount !== order.totalAmount) {
  //       return res.status(200).json({
  //         RspCode: '04',
  //         Message: 'Invalid amount'
  //       });
  //     }

  //     // Check if already processed
  //     if (order.paymentStatus === 'paid') {
  //       return res.status(200).json({
  //         RspCode: '02',
  //         Message: 'Order already confirmed'
  //       });
  //     }

  //     if (rspCode === '00') {
  //       // Payment successful
  //       order.paymentStatus = 'paid';
  //       order.paidAt = new Date();
  //       order.status = 'confirmed';
  //       order.confirmedAt = new Date();
  //       order.paymentInfo = {
  //         ...order.paymentInfo,
  //         transactionNo,
  //         bankCode,
  //         payDate,
  //         responseCode: rspCode,
  //         completedAt: new Date()
  //       };

  //       order.statusHistory.push({
  //         status: 'confirmed',
  //         note: `Payment confirmed via VNPay - Transaction: ${transactionNo}`,
  //         createdAt: new Date()
  //       });

  //       await order.save();

  //       return res.status(200).json({
  //         RspCode: '00',
  //         Message: 'Success'
  //       });
  //     } else {
  //       // Payment failed
  //       order.paymentStatus = 'failed';
  //       order.paymentInfo = {
  //         ...order.paymentInfo,
  //         responseCode: rspCode,
  //         failedAt: new Date()
  //       };

  //       order.statusHistory.push({
  //         status: 'payment_failed',
  //         note: `Payment failed via VNPay - Code: ${rspCode}`,
  //         createdAt: new Date()
  //       });

  //       await order.save();

  //       return res.status(200).json({
  //         RspCode: '00',
  //         Message: 'Success'
  //       });
  //     }
  //   } catch (error) {
  //     console.error('VNPay IPN Error:', error);
  //     return res.status(200).json({
  //       RspCode: '99',
  //       Message: 'Unknown error'
  //     });
  //   }
  // }

  // VNPay Return (Customer redirect)
  async vnpayReturn(req, res, next) {
    try {
      let vnpParams = req.query;

      const isValid = vnpayService.verifyReturnUrl(vnpParams);


      if (!isValid) {
        return res.redirect(`${process.env.CLIENT_URL}/payment/failure?message=Invalid signature`);
      }

      const orderId = vnpParams['vnp_TxnRef'];
      const rspCode = vnpParams['vnp_ResponseCode'];
      const transactionNo = vnpParams['vnp_TransactionNo'];
      const bankCode = vnpParams['vnp_BankCode'];
      const payDate = vnpParams['vnp_PayDate'];

      const order = await Order.findOne({ orderNumber: orderId });

      if (!order) {
        return res.redirect(`${process.env.CLIENT_URL}/payment/failure?message=Order not found`);
      }


      // ✅ KIỂM TRA ĐÃ XỬ LÝ CHƯA - Redirect ngay nếu đã paid
      if (order.paymentStatus === 'paid') {
        return res.redirect(`${process.env.CLIENT_URL}/payment/success?orderId=${order._id}`);
      }

      if (rspCode === '00') {
        // ✅ CHỈ CẬP NHẬT NẾU CHƯA PAID
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
        order.status = 'confirmed';
        order.confirmedAt = new Date();
        order.paymentInfo = {
          ...order.paymentInfo,
          transactionNo,
          bankCode,
          payDate,
          responseCode: rspCode,
          completedAt: new Date()
        };

        order.statusHistory.push({
          status: 'confirmed',
          note: `Payment confirmed via VNPay - Transaction: ${transactionNo}`,
          createdAt: new Date()
        });

        await order.save();

        await sendEmail({
          to: order.customerEmail,
          template: 'ORDER_SUCCESS',
          data: {
            fullName: order.customerName,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount
          }
        });

        return res.redirect(`${process.env.CLIENT_URL}/payment/success?orderId=${order._id}`);
      } else {
        // Payment failed
        order.paymentStatus = 'failed';
        order.paymentInfo = {
          ...order.paymentInfo,
          responseCode: rspCode,
          failedAt: new Date()
        };

        order.statusHistory.push({
          status: 'payment_failed',
          note: `Payment failed via VNPay - Code: ${rspCode}`,
          createdAt: new Date()
        });

        await order.save();

        return res.redirect(`${process.env.CLIENT_URL}/payment/failure?orderId=${order._id}&code=${rspCode}`);
      }
    } catch (error) {
      console.error('VNPay return error:', error);
      return res.redirect(`${process.env.CLIENT_URL}/payment/failure?message=System error`);
    }
  }
}

module.exports = new PaymentController();