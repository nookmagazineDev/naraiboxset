import fs from 'fs';
import https from 'https';

const download = (phrase, filename) => {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(phrase)}&tl=th&client=tw-ob`;
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error("Status code " + res.statusCode));
        return;
      }
      const file = fs.createWriteStream(filename);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
};

async function main() {
  fs.mkdirSync('./public/audio', { recursive: true });
  console.log('Downloading general completion...');
  await download('ออเดอร์สำเร็จแล้วค่ะ', './public/audio/completed.mp3');

  for (let i = 1; i <= 100; i++) {
    process.stdout.write(`Downloading order ${i}... `);
    try {
      await download(`ออเดอร์ที่ ${i} สำเร็จแล้วค่ะ`, `./public/audio/completed_${i}.mp3`);
      console.log('Done');
    } catch (e) {
      console.log('Failed:', e.message);
    }
    await new Promise(r => setTimeout(r, 200)); // Sleep to prevent rate limit
  }
}

main().then(() => console.log('All downloads completed!')).catch(console.error);
