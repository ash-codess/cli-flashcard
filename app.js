import { MongoClient, ObjectId } from 'mongodb';
import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import Table from 'cli-table3';
import moment from 'moment';
import { createSpinner } from 'nanospinner';
import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "flashcardSystem";

async function main() {
    try {
        await client.connect();
        console.log(chalk.green("Connected to MongoDB"));
        const db = client.db(dbName);
        const decks = db.collection("decks");
        const cards = db.collection("cards");

        console.log(chalk.blue(figlet.textSync('Quiz time', { horizontalLayout: 'full' })));

        while (true) {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        'Create Deck 📚',
                        'View Decks 👀',
                        'Add Flashcard 🃏',
                        'Study Deck 🧠',
                        'View Progress 📊',
                        'Delete Deck 🗑️',
                        'Delete Flashcard 🗑️🃏',
                        'Import Deck 📥',
                        'Export Deck 📤',
                        'Exit 👋'
                    ]
                }
            ]);

            switch (action) {
                case 'Create Deck 📚':
                    await createDeck(decks);
                    break;
                case 'View Decks 👀':
                    await viewDecks(decks);
                    break;
                case 'Add Flashcard 🃏':
                    await addFlashcard(decks, cards);
                    break;
                case 'Study Deck 🧠':
                    await studyDeck(decks, cards);
                    break;
                case 'View Progress 📊':
                    await viewProgress(decks, cards);
                    break;
                case 'Delete Deck 🗑️':
                    await deleteDeck(decks, cards);
                    break;
                case 'Delete Flashcard 🗑️🃏':
                    await deleteFlashcard(decks, cards);
                    break;
                case 'Import Deck 📥':
                    await importDeck(decks, cards);
                    break;
                case 'Export Deck 📤':
                    await exportDeck(decks, cards);
                    break;
                case 'Exit 👋':
                    console.log(chalk.yellow("Thank you for using Flashcard Study System. Goodbye! 👋"));
                    await client.close();
                    return;
            }
        }
    } catch (e) {
        console.error(chalk.red(e));
    } finally {
        await client.close();
    }
}

async function createDeck(decks) {
    const { deckName } = await inquirer.prompt([
        {
            type: 'input',
            name: 'deckName',
            message: 'Enter the name of the new deck:'
        }
    ]);

    const spinner = createSpinner('Creating deck...').start();
    await decks.insertOne({ name: deckName, createdAt: new Date() });
    spinner.success({ text: chalk.green(`Deck "${deckName}" created successfully! 🎉`) });
}

async function addFlashcard(decks, cards) {
    const deckList = await decks.find({}).toArray();
    const { deckId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'deckId',
            message: 'Choose a deck to add the flashcard to:',
            choices: deckList.map(deck => ({ name: deck.name, value: deck._id }))
        }
    ]);

    const { front, back } = await inquirer.prompt([
        {
            type: 'input',
            name: 'front',
            message: 'Enter the question or front side of the flashcard:'
        },
        {
            type: 'input',
            name: 'back',
            message: 'Enter the answer or back side of the flashcard:'
        }
    ]);

    const spinner = createSpinner('Adding flashcard...').start();
    await cards.insertOne({ deckId, front, back, createdAt: new Date(), lastReviewed: null, easeFactor: 2.5, interval: 0 });
    spinner.success({ text: chalk.green('Flashcard added successfully! 🃏') });
}

async function studyDeck(decks, cards) {
    const deckList = await decks.find({}).toArray();
    const { deckId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'deckId',
            message: 'Choose a deck to study:',
            choices: deckList.map(deck => ({ name: deck.name, value: deck._id }))
        }
    ]);

    const flashcards = await cards.find({ deckId }).toArray();
    if (flashcards.length === 0) {
        console.log(chalk.yellow('This deck has no flashcards yet. Add some cards first!'));
        return;
    }

    for (const card of flashcards) {
        console.log(chalk.blue('\n' + card.front));
        await inquirer.prompt([{ type: 'input', name: 'answer', message: 'Press enter to see the answer...' }]);
        console.log(chalk.green('Answer: ' + card.back));

        const { difficulty } = await inquirer.prompt([
            {
                type: 'list',
                name: 'difficulty',
                message: 'How difficult was this card?',
                choices: ['Easy 😊', 'Medium 😐', 'Hard 😓']
            }
        ]);

        // Update card based on spaced repetition algorithm (simplified version)
        let easeFactor = card.easeFactor;
        let interval = card.interval;

        switch (difficulty) {
            case 'Easy 😊':
                easeFactor += 0.1;
                interval = Math.max(1, interval * easeFactor);
                break;
            case 'Medium 😐':
                interval = Math.max(1, interval * easeFactor);
                break;
            case 'Hard 😓':
                easeFactor -= 0.15;
                interval = 1;
                break;
        }

        await cards.updateOne(
            { _id: card._id },
            { $set: { lastReviewed: new Date(), easeFactor, interval } }
        );
    }

    console.log(chalk.green('\nGreat job! You\'ve reviewed all cards in this deck. 🎉'));
}

async function viewProgress(decks, cards) {
    const allCards = await cards.find({}).toArray();
    
    const table = new Table({
        head: [chalk.blue('Deck'), chalk.blue('Total Cards'), chalk.blue('Mastered'), chalk.blue('Learning'), chalk.blue('New')],
        colWidths: [20, 15, 15, 15, 15]
    });

    const deckProgress = {};

    allCards.forEach(card => {
        const deckId = card.deckId.toString(); // Convert ObjectId to string
        if (!deckProgress[deckId]) {
            deckProgress[deckId] = { total: 0, mastered: 0, learning: 0, new: 0 };
        }

        deckProgress[deckId].total++;

        if (!card.lastReviewed) {
            deckProgress[deckId].new++;
        } else if (card.interval > 30) {
            deckProgress[deckId].mastered++;
        } else {
            deckProgress[deckId].learning++;
        }
    });

    for (const [deckId, progress] of Object.entries(deckProgress)) {
        const deck = await decks.findOne({ _id: new ObjectId(deckId) });
        table.push([
            deck ? deck.name : 'Unknown Deck',
            progress.total,
            progress.mastered,
            progress.learning,
            progress.new
        ]);
    }

    console.log(table.toString());
}

async function viewDecks(decks) {
    const allDecks = await decks.find({}).toArray();
    
    if (allDecks.length === 0) {
        console.log(chalk.yellow("No decks available. Create a deck first!"));
        return;
    }

    const table = new Table({
        head: [chalk.blue('Deck Name'), chalk.blue('Created At')],
        colWidths: [30, 30]
    });

    allDecks.forEach(deck => {
        table.push([
            deck.name,
            moment(deck.createdAt).format('MMMM Do YYYY, h:mm:ss a')
        ]);
    });

    console.log(table.toString());
}

async function deleteDeck(decks, cards) {
    const allDecks = await decks.find({}).toArray();
    
    if (allDecks.length === 0) {
        console.log(chalk.yellow("No decks available to delete."));
        return;
    }

    const { deckId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'deckId',
            message: 'Choose a deck to delete:',
            choices: allDecks.map(deck => ({ name: deck.name, value: deck._id }))
        }
    ]);

    const spinner = createSpinner('Deleting deck...').start();
    await decks.deleteOne({ _id: deckId });
    await cards.deleteMany({ deckId: deckId });
    spinner.success({ text: chalk.green('Deck and associated flashcards deleted successfully! 🗑️') });
}

async function deleteFlashcard(decks, cards) {
    const allDecks = await decks.find({}).toArray();
    
    if (allDecks.length === 0) {
        console.log(chalk.yellow("No decks available. Create a deck first!"));
        return;
    }

    const { deckId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'deckId',
            message: 'Choose a deck:',
            choices: allDecks.map(deck => ({ name: deck.name, value: deck._id }))
        }
    ]);

    const flashcards = await cards.find({ deckId: new ObjectId(deckId) }).toArray();

    if (flashcards.length === 0) {
        console.log(chalk.yellow("This deck has no flashcards to delete."));
        return;
    }

    const { cardId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'cardId',
            message: 'Choose a flashcard to delete:',
            choices: flashcards.map(card => ({ name: `${card.front} - ${card.back}`, value: card._id }))
        }
    ]);

    const spinner = createSpinner('Deleting flashcard...').start();
    await cards.deleteOne({ _id: cardId });
    spinner.success({ text: chalk.green('Flashcard deleted successfully! 🗑️🃏') });
}

async function importDeck(decks, cards) {
    const { filePath, fileType } = await inquirer.prompt([
        {
            type: 'input',
            name: 'filePath',
            message: 'Enter the path to the import file:'
        },
        {
            type: 'list',
            name: 'fileType',
            message: 'Select the file type:',
            choices: ['CSV', 'JSON']
        }
    ]);

    const spinner = createSpinner('Importing deck...').start();

    try {
        let importedData;

        if (fileType === 'CSV') {
            importedData = await new Promise((resolve, reject) => {
                const results = [];
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => results.push(data))
                    .on('end', () => resolve(results))
                    .on('error', reject);
            });
        } else {
            const fileContent = await fs.readFile(filePath, 'utf8');
            importedData = JSON.parse(fileContent);
        }

        const deckName = path.basename(filePath, path.extname(filePath));
        const newDeck = await decks.insertOne({ name: deckName, createdAt: new Date() });

        for (const card of importedData) {
            await cards.insertOne({
                deckId: newDeck.insertedId,
                front: card.front,
                back: card.back,
                createdAt: new Date(),
                lastReviewed: null,
                easeFactor: 2.5,
                interval: 0
            });
        }

        spinner.success({ text: chalk.green(`Deck "${deckName}" imported successfully with ${importedData.length} cards! 🎉`) });
    } catch (error) {
        spinner.error({ text: chalk.red(`Error importing deck: ${error.message}`) });
    }
}

async function exportDeck(decks, cards) {
    const deckList = await decks.find({}).toArray();
    const { deckId, fileType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'deckId',
            message: 'Choose a deck to export:',
            choices: deckList.map(deck => ({ name: deck.name, value: deck._id }))
        },
        {
            type: 'list',
            name: 'fileType',
            message: 'Select the export file type:',
            choices: ['CSV', 'JSON']
        }
    ]);

    const spinner = createSpinner('Exporting deck...').start();

    try {
        const deck = await decks.findOne({ _id: deckId });
        const flashcards = await cards.find({ deckId }).toArray();

        const exportData = flashcards.map(({ front, back }) => ({ front, back }));

        if (fileType === 'CSV') {
            const csvWriter = createObjectCsvWriter({
                path: `${deck.name}.csv`,
                header: [
                    { id: 'front', title: 'FRONT' },
                    { id: 'back', title: 'BACK' }
                ]
            });

            await csvWriter.writeRecords(exportData);
        } else {
            await fs.writeFile(`${deck.name}.json`, JSON.stringify(exportData, null, 2));
        }

        spinner.success({ text: chalk.green(`Deck "${deck.name}" exported successfully as ${fileType}! 📤`) });
    } catch (error) {
        spinner.error({ text: chalk.red(`Error exporting deck: ${error.message}`) });
    }
}

main().catch(console.error);