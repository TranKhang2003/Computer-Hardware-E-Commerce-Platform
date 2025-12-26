# 🛒 E-Commerce Platform

> A full-stack e-commerce application with real-time features, comprehensive admin dashboard, and modern UI/UX design.

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live-Demo-success?style=for-the-badge&logo=google-chrome)](https://dv10ewzkxck25.cloudfront.net/)
[![API Status](https://img.shields.io/badge/API-Online-brightgreen?style=for-the-badge&logo=fastapi)](https://hardvia-api.work.gd)

**[View Live Demo](https://dv10ewzkxck25.cloudfront.net/)** | **[API Endpoint](https://hardvia-api.work.gd)**

Administrator Account : admin@gmail.com 
Pass: admin124
</div>

---

## 🎯 Project Overview

A production-ready e-commerce platform showcasing full-stack development skills with real-time communication, scalable architecture, and cloud deployment expertise. This project demonstrates end-to-end implementation from design to deployment.

### ⚡ Quick Highlights

- ✅ **Fully Deployed** on AWS CloudFront with custom API domain
- ✅ **Real-time Features** using WebSocket for live updates
- ✅ **Scalable Architecture** with horizontal scaling support
- ✅ **Complete Admin Dashboard** for business management

---

## ✨ Key Features Implemented

### 👤 User Authentication & Management
- ✅ Social media authentication integration
- ✅ User profile management
- ✅ Password change and recovery system
- ✅ Multiple delivery addresses support
- ✅ Purchase history tracking

### 🛍️ Shopping Features
- ✅ Product catalog with category browsing
- ✅ Product details with variants display
- ✅ Advanced search and filtering by keyword
- ✅ Product sorting (price, date, relevance)
- ✅ Shopping cart with real-time updates
- ✅ Complete checkout process
- ✅ Discount code application
- ✅ Email notifications after purchase
- ✅ Product reviews and ratings
- ✅ **Real-time review/rating updates via WebSocket**

### 🎁 Advanced Features
- ✅ Loyalty programs for customers
- ✅ Discount code management system

### 👨‍💼 Admin Dashboard
- ✅ User management panel
- ✅ Product management (CRUD operations)
- ✅ Discount/promotion management
- ✅ Order list view with filtering
- ✅ Order details and status modification
- ✅ Simple analytics dashboard

### 🎨 UI/UX Excellence
- ✅ Modern, intuitive interface
- ✅ Smooth user experience
- ✅ Loading states and error handling

### ⚙️ Technical Excellence
- ✅ Horizontal scaling capability
- ✅ RESTful API design
- ✅ WebSocket real-time communication
- ✅ Cloud deployment (AWS)
- ✅ CDN integration (CloudFront)
- ✅ S3 storage with image optimization

---

## 🛠️ Technology Stack

### Frontend
```
React 18.x          - UI library
Vite 5.x            - Build tool
Tailwind CSS        - Styling
React Router v6     - Routing
Axios               - HTTP client
Socket.io Client    - Real-time communication
Shadcn/ui           - UI components
Lucide React        - Icons
Zustand             - Store
```

### Backend
```
Node.js 18.x        - Runtime environment
Express.js          - Web framework
MongoDB Atlas       - Database
Socket.io           - WebSocket server
JWT                 - Authentication
Passport.js         - OAuth strategies
Nodemailer          - Email service
Crypto              - Encryption
```


---

## 📊 System Architecture

```
┌─────────────────┐
│   CloudFront    │ ← CDN for React app
│   (Frontend)    │
└────────┬────────┘
         │
┌────────▼────────┐
│   React App     │
│   (Vite Build)  │
└────────┬────────┘
         │ HTTPS
         │
┌────────▼────────┐
│   EC2 Instance  │
│   ┌──────────┐  │
│   │  Nginx   │  │ ← Reverse Proxy + SSL
│   └────┬─────┘  │
│        │        │
│   ┌────▼─────┐  │
│   │ Node.js  │  │ ← Express API
│   │   :5000  │  │
│   └────┬─────┘  │
└────────┼────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼───┐ ┌──▼──┐   ┌───▼───┐  ┌──▼───┐
│MongoDB│ │Redis│   │  S3   │  │VNPay │
│ Atlas │ │Cloud│   │Bucket │  │ API  │
└───────┘ └─────┘   └───────┘  └──────┘
```

---

## 🎬 Demo & Screenshots

### 🔗 Live Application
**Frontend**: [https://dv10ewzkxck25.cloudfront.net/](https://dv10ewzkxck25.cloudfront.net/)  
**API**: hardvia-api.work.gd

### 📸 Application Screenshots

<div align="center">

<img width="1917" height="1019" alt="image" src="https://github.com/user-attachments/assets/ac5397d3-0498-47f4-974e-8d1fcfca21e0" />

<img width="1919" height="1021" alt="image" src="https://github.com/user-attachments/assets/42a9596a-24d8-4317-9da6-d1042c7af8ec" />

<img width="1915" height="1020" alt="image" src="https://github.com/user-attachments/assets/80332d50-f808-43c2-af03-927825c5e8f6" />

<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/d87b1974-92f6-4ecf-915b-28b014d8e90b" />

<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/dbc8079c-4917-45a4-9bda-21dfac12effd" />

<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/c6184155-8f27-4ca6-ad7c-8afb43502913" />

<img width="1919" height="1021" alt="image" src="https://github.com/user-attachments/assets/5ef9eb83-5f1d-4c40-9cfe-d5fb053afac5" />

<img width="1919" height="1020" alt="image" src="https://github.com/user-attachments/assets/68fb677d-efa5-4713-8d67-2d6fd0debf38" />

<img width="1919" height="1023" alt="image" src="https://github.com/user-attachments/assets/f9e63932-8cb0-4fa1-b235-ab9c09653040" />

<img width="1919" height="1021" alt="image" src="https://github.com/user-attachments/assets/ba8ed27a-62c0-4baf-83ca-a712312970d8" />


</div>

---

## 💡 Technical Challenges & Solutions

### Challenge 1: Real-time Updates
**Problem**: Need to update product reviews and ratings instantly across all users  
**Solution**: Implemented WebSocket connection for bidirectional real-time communication

### Challenge 2: Scalability
**Problem**: Application must handle growing user base  
**Solution**: Designed stateless backend architecture supporting horizontal scaling

### Challenge 3: Performance
**Problem**: Fast global content delivery  
**Solution**: Deployed frontend on AWS CloudFront CDN with edge caching

### Challenge 4: User Experience
**Problem**: Complex checkout process causing cart abandonment  
**Solution**: Streamlined multi-step checkout with progress indicators and validation

---

## 🎓 Skills Demonstrated

### Technical Skills
- Full-stack web development (Frontend + Backend)
- RESTful API design and implementation
- Real-time communication (WebSocket)
- Database design and optimization
- Authentication and authorization
- Cloud deployment (AWS)

### Soft Skills
- Problem-solving and debugging
- System architecture design
- Project planning and execution
- Self-directed learning
- Attention to detail

---

## 🚀 Future Improvements

- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Multi-language support (i18n)
- [ ] Advanced product recommendations using ML
- [ ] Mobile application (React Native/Flutter)
- [ ] Enhanced analytics dashboard
- [ ] Inventory management system
- [ ] Live chat customer support
- [ ] Progressive Web App (PWA)



## 📄 Additional Information

### Why This Project?

This e-commerce platform was built to demonstrate comprehensive full-stack development skills and real-world application deployment. The project showcases:

- End-to-end feature implementation
- Modern development practices
- Production-ready code quality
- Cloud deployment expertise
- Problem-solving abilities

### Learning Outcomes

Through this project, I gained hands-on experience with:
- Building scalable web applications
- Implementing real-time features
- Working with cloud services (AWS)
- Database design and optimization

---

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Deployed on AWS infrastructure for reliability and performance
- Designed with user experience as top priority

