# BareMind - Project Specification

Version: 1.0

---

# Project Overview

BareMind is a modern, full-stack blogging platform where anyone can register, write blogs, publish articles, discover content, follow writers, and engage with the community.

This project must be built as a production-quality application instead of a simple CRUD project.

The implementation should follow clean architecture, scalable design, and industry best practices.

---

# Project Goal

Create a modern blogging platform similar to Medium, Hashnode, and Dev.to while maintaining a unique identity.

The application should be responsive, secure, modular, maintainable, and production-ready.

---

# Theme

Only Light Theme

Dark mode is intentionally not included.

---

# User Roles

## Guest

Can

- Browse homepage
- Read blogs
- Search blogs
- View author profiles
- View categories
- View tags

Cannot

- Create blogs
- Like
- Comment
- Bookmark
- Follow users

---

## Registered User

Can

- Register
- Login
- Logout
- Verify email
- Reset password
- Create blogs
- Save drafts
- Publish blogs
- Edit blogs
- Delete blogs
- Upload cover images
- Add tags
- Add categories
- Comment
- Reply to comments
- Like blogs
- Bookmark blogs
- Follow users
- Manage profile
- View dashboard
- View analytics

---

## Admin

Can

- Manage users
- Manage blogs
- Manage categories
- Manage tags
- Remove inappropriate content
- View platform statistics
- Moderate reports

---

# Core Features

## Authentication

- User Registration
- Login
- Logout
- JWT Authentication
- Refresh Tokens
- Email Verification
- Forgot Password
- Reset Password
- Change Password
- Update Profile
- Upload Profile Image

---

## User Profile

- Avatar
- Bio
- Social Links
- Website
- Followers
- Following
- Published Blogs
- Drafts
- Reading History
- Bookmarks

---

## Blog Management

- Create Blog
- Edit Blog
- Delete Blog
- Draft Support
- Publish Blog
- Cover Image
- Rich Text Editor
- Markdown Support
- Categories
- Tags
- Reading Time Calculation
- SEO Friendly Slug
- Featured Image
- Auto Save Draft

---

## Homepage

- Featured Blogs
- Trending Blogs
- Latest Blogs
- Popular Categories
- Popular Tags
- Recommended Authors

---

## Blog Reading

- Like Blog
- Bookmark Blog
- Share Blog
- Comments
- Nested Replies
- Report Blog
- Related Articles

---

## Search

- Search by Title
- Search by Category
- Search by Tag
- Search by Author
- Search Suggestions
- Pagination

---

## Categories

Examples

- Technology
- Programming
- DevOps
- AI
- Cloud
- Business
- Finance
- Education
- Travel
- Food
- Health

---

## Dashboard

- Total Blogs
- Published Blogs
- Drafts
- Views
- Likes
- Comments
- Followers
- Bookmarks

---

## Notifications

- New Follower
- New Comment
- Blog Like
- Blog Published
- Password Changed
- Email Verification

---

## Admin Panel

- Dashboard
- User Management
- Blog Moderation
- Category Management
- Tag Management
- Reports
- Analytics

---

# Non Functional Requirements

- Responsive UI
- Mobile Friendly
- Fast Loading
- Secure Authentication
- Modular Architecture
- Clean Code
- Production Ready
- REST API
- Proper Error Handling
- Logging
- Input Validation

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- Redux Toolkit
- Axios
- React Hook Form
- Zod
- Framer Motion

---

## Backend

- Python
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- JWT Authentication
- Celery
- Pillow

---

## Database

- PostgreSQL

---

## Cache

- Redis

---

# Docker Services

Only infrastructure services should run using Docker.

Services

- PostgreSQL
- Redis
- pgAdmin
- Redis Commander
- Mailpit

Frontend and Backend should run directly during development.

---

# Database Modules

- Users
- User Profiles
- Blogs
- Drafts
- Categories
- Tags
- Blog Tags
- Comments
- Replies
- Likes
- Bookmarks
- Followers
- Notifications
- Password Reset Tokens
- Email Verification Tokens
- Refresh Tokens

---

# Frontend Pages

## Public

- Home
- Explore
- Search
- Categories
- Blog Details
- Author Profile
- Login
- Register
- Forgot Password
- Reset Password

---

## User

- Dashboard
- Create Blog
- Edit Blog
- Drafts
- My Blogs
- Bookmarks
- Notifications
- Followers
- Following
- Settings

---

## Admin

- Dashboard
- Users
- Blogs
- Categories
- Tags
- Reports

---

# Rich Text Editor

Must support

- Headings
- Bold
- Italic
- Underline
- Lists
- Code Blocks
- Tables
- Images
- Quotes
- Links
- Horizontal Rule

---

# API Modules

- Authentication
- Users
- Blogs
- Categories
- Tags
- Comments
- Likes
- Bookmarks
- Followers
- Notifications
- Search
- Dashboard
- Admin

---

# Security Requirements

- Password Hashing
- JWT Authentication
- Refresh Tokens
- CSRF Protection (where applicable)
- Rate Limiting
- Input Validation
- SQL Injection Protection
- XSS Protection
- CORS Configuration

---

# Logging

Application should maintain logs for

- Authentication
- Errors
- Blog Creation
- Blog Update
- Blog Delete
- Admin Actions

---

# File Upload

Users can upload

- Profile Images
- Blog Cover Images

Store locally during development.

---

# Email Features

- Email Verification
- Password Reset
- Welcome Email

Use Mailpit during development.

---

# Project Structure

frontend/

backend/

docs/

docker/

uploads/

scripts/

.github/

---

# Development Rules

- No mock APIs
- No placeholder code
- No TODO implementations
- Follow clean architecture
- Follow SOLID principles
- Use environment variables
- Write reusable components
- Use reusable services
- Keep modules independent
- Every feature must be production-ready
- Proper exception handling
- Proper validation
- Meaningful commit messages

---

# Future Scope (Not in Version 1)

- Kubernetes
- Terraform
- Dockerized Frontend
- Dockerized Backend
- Elasticsearch
- AI Blog Suggestions
- AI Summaries
- Multi-language Support
- Dark Theme
- Mobile Applications

---

# Definition of Done

The project is considered complete when:

- All authentication flows work.
- Users can publish blogs.
- Users can edit and delete their blogs.
- Rich text editor is fully functional.
- Search works.
- Comments work.
- Likes work.
- Bookmarks work.
- Followers work.
- Notifications work.
- Dashboard works.
- Admin panel works.
- API documentation is available.
- PostgreSQL and Redis run through Docker.
- Application runs locally without errors.
- Code is modular and maintainable.
- The project is production-ready.