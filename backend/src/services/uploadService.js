const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');


// Cấu hình AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-southeast-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * Upload file to S3
 * @param {Object} file - File từ multer
 * @returns {Promise<string>} - URL của file đã upload
 */
const uploadToS3 = async (file, folder = 'products') => {
  try {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${uuidv4()}${fileExtension}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload image to S3');
  }
};


/**
 * Xóa file từ S3
 * @param {string} fileUrl - URL của file cần xóa
 * @returns {Promise<boolean>}
 */
const deleteFromS3 = async (fileUrl) => {
  try {
    // Extract key từ URL
    const urlParts = new URL(fileUrl);
    const key = urlParts.pathname.substring(1); // Bỏ dấu / đầu tiên

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return false;
  }
};

/**
 * Xóa nhiều files từ S3
 * @param {string[]} fileUrls - Mảng URLs cần xóa
 * @returns {Promise<boolean>}
 */
const deleteMultipleFromS3 = async (fileUrls) => {
  try {
    if (!fileUrls || fileUrls.length === 0) return true;

    const keys = fileUrls
      .filter(url => url && url.includes(BUCKET_NAME))
      .map(url => {
        const urlParts = new URL(url);
        return { Key: urlParts.pathname.substring(1) };
      });

    if (keys.length === 0) return true;

    const params = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys,
        Quiet: false,
      },
    };

    await s3.deleteObjects(params).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Multiple Error:', error);
    return false;
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  deleteMultipleFromS3,
};