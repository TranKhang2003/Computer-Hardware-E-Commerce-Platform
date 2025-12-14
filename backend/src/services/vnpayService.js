const crypto = require('crypto');
const moment = require('moment-timezone');
const qs = require('qs'); // ✅ Dùng qs thay vì querystring
const { VNPAY } = require('../config/constants');

class VNPayService {
  createPaymentUrl(orderId, amount, orderInfo, ipAddr, locale = 'vn') {
    const date = new Date();

    // ✅ Format date giống demo VNPay
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    const expireDate = moment(date).add(15, 'minutes').format('YYYYMMDDHHmmss');

    // Clean IP
    let cleanIpAddr = ipAddr;
    if (cleanIpAddr && cleanIpAddr.includes('::ffff:')) {
      cleanIpAddr = cleanIpAddr.replace('::ffff:', '');
    }
    if (!cleanIpAddr || cleanIpAddr === '::1' || cleanIpAddr === '::ffff:1') {
      cleanIpAddr = '127.0.0.1';
    }

    // Clean order info
    const cleanOrderInfo = String(orderInfo)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();


    // ✅ Tạo params giống demo VNPay
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = VNPAY.TMN_CODE;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = String(orderId);
    vnp_Params['vnp_OrderInfo'] = cleanOrderInfo;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = Math.round(amount) * 100; // làm tròn sang số nguyên
    ; // Số tiền theo VNPay (10,000 VND)
    vnp_Params['vnp_ReturnUrl'] = VNPAY.RETURN_URL;
    vnp_Params['vnp_IpAddr'] = '127.0.0.1';
    vnp_Params['vnp_CreateDate'] = createDate;
    vnp_Params['vnp_BankCode'] = 'VNBANK';
    vnp_Params['vnp_ExpireDate'] = expireDate;


    // ✅ Sort params
    vnp_Params = this.sortObject(vnp_Params);

    // ✅ Dùng qs.stringify với encode: false (giống demo)
    const signData = qs.stringify(vnp_Params, { encode: false });

    // ✅ Tạo hash giống demo VNPay
    const hmac = crypto.createHmac('sha512', VNPAY.HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');


    vnp_Params['vnp_SecureHash'] = signed;

    // ✅ Build URL với qs.stringify, encode: false
    const vnpUrl = VNPAY.URL + '?' + qs.stringify(vnp_Params, { encode: false });


    return vnpUrl;
  }

  verifyReturnUrl(vnp_Params) {
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = this.sortObject(vnp_Params);

    // ✅ Dùng qs.stringify với encode: false
    const signData = qs.stringify(vnp_Params, { encode: false });



    const hmac = crypto.createHmac('sha512', VNPAY.HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');



    return secureHash === signed;
  }

  sortObject(obj) {
    const sorted = {};
    const str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
    }
    return sorted;
  }

  convertToVND(amountUSD) {
    return Math.round(amountUSD * 25000);
  }
}

module.exports = new VNPayService();