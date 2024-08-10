import express from 'express';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer';

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the "public" directory

app.post('/post-comments', async (req, res) => {
  const { urls, comment } = req.body;

  if (!urls || !comment) {
    return res.status(400).json({ message: 'URLs and comment are required.' });
  }

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to Instagram login page...');
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

    console.log('Entering username and password...');
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', 'sourceoftruths');
    await page.type('input[name="password"]', 'Kashish#1994');

    console.log('Clicking login button...');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Verifying login...');
    const loggedIn = await page.evaluate(() => {
      return document.querySelector('div[role="dialog"]') === null;
    });

    if (!loggedIn) {
      console.error('Login failed. Check credentials or additional security steps.');
      throw new Error('Login failed');
    }

    // Process each URL
    for (const reelUrl of urls) {
      console.log(`Navigating to reel: ${reelUrl}`);
      await page.goto(reelUrl, { waitUntil: 'networkidle2' });

      console.log('Waiting for comment box...');
      await page.waitForSelector('textarea[aria-label="Add a comment…"]', { visible: true });

      console.log('Adding comment...');
      await page.click('textarea[aria-label="Add a comment…"]');
      await page.type('textarea[aria-label="Add a comment…"]', comment);
      await page.keyboard.press('Enter');

      console.log('Waiting for comment to be posted...');
      await page.waitForFunction(
        (comment) => {
          const textarea = document.querySelector('textarea[aria-label="Add a comment…"]');
          return !textarea || textarea.value === '';
        },
        { timeout: 15000 }, // Increased timeout for waiting
        comment
      );
    }

    res.json({ message: 'Comments posted successfully.' });
  } catch (error) {
    console.error('Error posting comments:', error);
    res.status(500).json({ message: 'Error posting comments.', error: error.message });
  } finally {
    await browser.close();
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
