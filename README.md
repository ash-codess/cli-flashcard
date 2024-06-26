# 📚 Advanced Flashcard Study System

An interactive command-line flashcard study system built with Node.js and MongoDB. This application helps users create, manage, and study flashcards using spaced repetition techniques for efficient learning.

![img]('C:\Users\astha\OneDrive\Documents\Projects\flashcard-study-system\samples\image.png')

## 🌟 Features

- 📝 Create and manage multiple flashcard decks
- 🃏 Add, view, and delete flashcards within decks
- 🧠 Study flashcards using a spaced repetition algorithm
- 📊 View progress and statistics for each deck
- 📥 Import decks from CSV or JSON files
- 📤 Export decks to CSV or JSON files
- 🎨 Colorful and intuitive command-line interface

## 🛠️ Technologies Used

- Node.js
- MongoDB
- Inquirer.js for interactive command-line interface
- Chalk for colorful console output
- Figlet for ASCII art text
- Moment.js for date formatting
- Nanospinner for loading animations
- CSV-parser and CSV-writer for CSV file handling

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or later)
- MongoDB (Make sure it's running on your system)

### Installation

1. Clone the repository:
2. Navigate to the project directory:
3. Install dependencies: `npm install`
4. Create a `.env` file in the root directory and add your MongoDB connection string:
``MONGODB_URI=mongodb://localhost:27017/flashcardSystem``
5. Run the application: `node app.js`

## 🎮 Usage

Upon starting the application, you'll be presented with a menu of options:

- Create Deck 📚
- View Decks 👀
- Add Flashcard 🃏
- Study Deck 🧠
- View Progress 📊
- Delete Deck 🗑️
- Delete Flashcard 🗑️🃏
- Import Deck 📥
- Export Deck 📤
- Exit 👋

Use the arrow keys to navigate and press Enter to select an option.

### Importing Decks

You can import decks from CSV or JSON files. The file format should be:

For CSV:

| FRONT | BACK |
---------|-----------
| Question 1 | Answer 1 |
| Question 2 | Answer 2|

For JSON:
```json
[
  {
    "front": "Question 1",
    "back": "Answer 1"
  },
  {
    "front": "Question 2",
    "back": "Answer 2"
  }
]
