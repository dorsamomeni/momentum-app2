# Momentum User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Coach Interface](#coach-interface)
5. [Athlete Interface](#athlete-interface)
6. [Common Features](#common-features)
7. [Troubleshooting](#troubleshooting)

## Introduction

Momentum is a mobile application designed for powerlifting coaches and athletes to streamline program creation, workout logging, and progress tracking. This manual provides comprehensive guidance on how to use all features of the application.

### Key Features

- **For Coaches**: Create and manage client relationships, design structured training programs, monitor client progress
- **For Athletes**: Follow coach-assigned programs, log workout data, track personal progress through analytics

## Installation

### Using Expo Go (Development/Testing)

1. Download the Expo Go app on your mobile device:
   - [iOS App Store](https://apps.apple.com/app/apple-store/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Open Expo Go and scan the QR code provided by your coach or developer
3. The app will load directly on your device

### Production Version (Coming Soon)

- Download directly from the App Store (iOS) or Google Play Store (Android)
- Install like any standard mobile application
- No additional setup required

## Getting Started

### Account Creation

1. Open the app and navigate swipe through the onboarding screens
2. Tap "Create Account" on the opening screen
3. Enter your details (eg. Name, Username, Email, Password)
4. Select your role depending on desired account type: "Coach" or "Athlete"
5. Once you tap "Create Account" you'll be prompted to enter your current max lifts (optional)

### Logging In

1. Open the app and tap "Sign In" on the opening screen
2. Enter your email/username and password
3. Tap "Sign In"

## Coach Interface

### Dashboard Overview

The coach interface has four main tabs:

- **Clients**: View list of athletes + access template, friend requests and add clients
- **Analytics**: Access client analytics and demo data
- **Find Clients**: Frontend pages demonstrating client acquision feature
- **Settings**: View account information, logout or delete account

### Managing Clients

#### Adding Client and Accepting Requests

1. Navigate to the "Clients" tab
2. Tap the "Add Client" icon in the top right corner
3. Use the search field to find athletes by name or username
4. Tap the "Request" button next to their name to send a connection request
5. Once accepted, they will appear in your clients list in "Clients" tab
6. You can also view your incoming and outgoing requests by tap "Requests" icon in the "Clients" tab
7. You can remove a client by clicking the "x" button next to their name on the "Clients" tab

#### Viewing Client Details

1. From the "Clients" tab, tap on any client's name
2. View their profile, active and previous programs, and create new blocks

### Creating Training Programs

#### Creating a New Block

1. Navigate to a client's profile
2. Tap "New Block"
3. Enter block details:
   - Name (e.g., "Strength Phase 1")
   - Start and end dates
   - Sessions per week (this will initialise the block with the correct number of sessions every time a week is created)
4. Tap "Create Block"

#### Building a Workout Program

1. Navigate from "Clients" tab to a User Profile
2. Open a block by tapping on it
3. Add weeks by tapping "+" at the bottom of the screen (you can swipe between the weeks tab for easy access)
4. For each week:
   - Add days by tapping "Add Day"
   - Remove days by tapping the trash icon on each day
   - Add exercises by tapping "Add Exercise" within a day (or the + button next to bin icon)
5. Create exercises by simply typing...
   - Enter exercise name
   - Enter scheme eg. (3 x 5 @ RPE 7 , 60KG)
   - Add sets by clicking "Add Set" on an exercise
   - Optonally: add notes or enter the weights for clients to follow
6. Three buttons exist at the top of the page
   - "Duplicate Week": to create a copy of a week and add it to the block
   - "Delete Week": to delete a week from the block
   - "Close": to close the block and return to the client's profile
7. Customise blocks by tapping pencil icons for:

   - Block name
   - Start and end dates
   - Week name

8. All changes save automatically in real-time

#### Using Templates

1. Tap on the "My Templates" button via the "Clients" tab
2. Create templates following similar steps to building a program
3. When creating a new block, select "Use Template" to apply a pre-made program

### Tracking Progress

1. Navigate to the "Analytics" tab
2. Search client name or username and tap on name
3. View their progress charts for key lifts (Squats, Bench, Deadlift)
4. Filter by date range using the year selector
5. Tap on load demo data to see what the charts will look like over time
6. Tap on any plot to view weight achieved and date of lift

## Athlete Interface

### Dashboard Overview

The athlete interface has four main tabs:

- **Prorgrams**: View your current training programs
- **Analytics**: Track performance metrics over time
- **Settings**: Configure account settings and preferences
- **Find Coach**: Only appears when athlete does not have a coach

### Connecting with a Coach

Exact same steps as adding a client

### Following a Training Program

1. Navigate to the "Programs" tab
2. Tap on an active block to view its details
3. Tap on relevant week to view assigned workouts
4. Complete the exercises as prescribed by your coach

### Logging Workouts

1. Open the workout for the current day
2. For each exercise:
   - Enter the weight used for each set
   - Add notes if necessary (optional)
3. All data is automatically synced to your coach's view

### Tracking Personal Progress

1. Navigate to the "Analytics" tab
2. View charts displaying progress for:
   - Squat
   - Bench Press
   - Deadlift
3. Use the year selector to view different time periods
4. Update your max lifts by tapping "Update Max Lifts" and submitting the new values by tapping "Save"
   (if you only want to update one lift, leave the rest blank)
5. Optionally view demo data to see what the charts will look like over time
6. Tap on any plot to view weight achieved and date of lift

### Offline Mode

1. The app functions offline once initially loaded
2. Changes made offline will sync when internet connection is restored

## Troubleshooting

### Connection Issues

- Ensure your device has an active internet connection
- Try closing and reopening the app
- Ensure you are on the same network connection as where you run "npx expo go"

### Login Problems

- Verify your email and password are correct
- Ensure caps lock is not enabled when entering your password

### Data Not Syncing

- Check your internet connection
- Navigate to another screen and return to refresh
- If issues persist, log out and log back in

---

For additional support, please contact dorsa.momeni@glasgow.ac.uk
