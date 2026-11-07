const fs = require('fs');
const readline = require('readline');

const stream = fs.createReadStream('C:/Users/lahirs/.gemini/antigravity/brain/5a98aac6-a4cb-4a5f-9394-77d4c6e08078/.system_generated/logs/transcript_full.jsonl');
const rl = readline.createInterface({ input: stream });

let lastUserInput = null;
rl.on('line', (line) => {
  if (line.includes('"type":"USER_INPUT"')) {
    lastUserInput = line;
  }
});

rl.on('close', () => {
  if (lastUserInput) {
    const data = JSON.parse(lastUserInput);
    fs.writeFileSync('temp_user_data.txt', data.content, 'utf8');
    console.log('Saved user data length:', data.content.length);
  } else {
    console.log('No user input found');
  }
});

