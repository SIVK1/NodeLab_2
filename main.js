const { createInterface } = require('node:readline');
const { stdin, stdout } = require('node:process');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { createBrotliCompress, createBrotliDecompress } = require('node:zlib');


const args = process.argv.slice(2);
let username = args.find(arg => arg.startsWith('--username='))?.split('=')[1] || 'User'; 
let currentDir = path.join(os.homedir(), 'Desktop');

const rl = createInterface({
  input: stdin,
  output: stdout
});

async function initialize() {
  console.log(`Welcome to the File Manager, ${username}!`);
  showCurrentDir();
  promptUser();
}

function showCurrentDir() {
  console.log(`You are currently in ${currentDir}`);
}

function promptUser() {
  rl.question('> ', handleCommand);
}

async function handleCommand(input) {
  const [command, ...args] = input.trim().split(' ');
  
  try {
    switch (command) {
      case 'up':
        await goUp();
        break;
      case 'cd':
        await changeDir(args[0]);
        break;
      case 'ls':
        await listDir();
        break;
      case 'cat':
        await readFile(args[0]);
        break;
      case 'add':
        await createFile(args[0]);
        break;
      case 'rn':
        await renameFile(args[0], args[1]);
        break;
      case 'cp':
        await copyFile(args[0], args[1]);
        break;
      case 'mv':
        await moveFile(args[0], args[1]);
        break;
      case 'rm':
        await removeFile(args[0]);
        break;
      case 'os':
        await handleOsCommand(args[0]);
        break;
      case 'hash':
        await calculateHash(args[0]);
        break;
      case 'compress':
        await compressFile(args[0], args[1]);
        break;
      case 'decompress':
        await decompressFile(args[0], args[1]);
        break;
      case '.exit':
        exitProgram();
        return;
      default:
        console.log('Invalid input');
    }
  } catch (error) {
    console.log('Operation failed');
  }
  
  showCurrentDir();
  promptUser();
}

async function goUp() {
  const parentDir = path.dirname(currentDir);
  if (parentDir !== currentDir) {
    currentDir = parentDir;
  }
}

async function changeDir(dirPath) {
  if (!dirPath) throw new Error('No path provided');
  const newPath = path.resolve(currentDir, dirPath);
  const stats = await fs.stat(newPath);
  if (stats.isDirectory()) {
    currentDir = newPath;
  } else {
    throw new Error('Not a directory');
  }
}

async function listDir() {
  const items = await fs.readdir(currentDir, { withFileTypes: true });
  const folders = items.filter(item => item.isDirectory())
    .map(item => ({ name: item.name, type: 'directory' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = items.filter(item => item.isFile())
    .map(item => ({ name: item.name, type: 'file' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  console.table([...folders, ...files]);
}

async function readFile(filePath) {
  if (!filePath) throw new Error('No path provided');
  const fullPath = path.resolve(currentDir, filePath);
  const stream = fsSync.createReadStream(fullPath);
  stream.pipe(stdout);
  await new Promise(resolve => stream.on('end', resolve));
}

async function createFile(fileName) {
  if (!fileName) throw new Error('No filename provided');
  const fullPath = path.join(currentDir, fileName);
  await fs.writeFile(fullPath, '');
}

async function renameFile(filePath, newFileName) {
  if (!filePath || !newFileName) throw new Error('Missing arguments');
  const oldPath = path.resolve(currentDir, filePath);
  const newPath = path.join(currentDir, newFileName);
  await fs.rename(oldPath, newPath);
}

async function copyFile(filePath, destDir) {
  if (!filePath || !destDir) throw new Error('Missing arguments');
  const srcPath = path.resolve(currentDir, filePath);
  const destPath = path.resolve(currentDir, destDir, path.basename(filePath));
  const readStream = fsSync.createReadStream(srcPath);
  const writeStream = fsSync.createWriteStream(destPath);
  readStream.pipe(writeStream);
  await new Promise(resolve => writeStream.on('finish', resolve));
}

async function moveFile(filePath, destDir) {
  if (!filePath || !destDir) throw new Error('Missing arguments');
  await copyFile(filePath, destDir);
  await removeFile(filePath);
}

async function removeFile(filePath) {
  if (!filePath) throw new Error('No path provided');
  const fullPath = path.resolve(currentDir, filePath);
  await fs.unlink(fullPath);
}

async function handleOsCommand(flag) {
  if (!flag) throw new Error('No flag provided');
  switch (flag) {
    case '--EOL':
      console.log(JSON.stringify(os.EOL));
      break;
    case '--cpus':
      const cpus = os.cpus();
      console.log(`Total CPUs: ${cpus.length}`);
      cpus.forEach((cpu, index) => {
        console.log(`CPU ${index}: ${cpu.model}, ${(cpu.speed / 1000).toFixed(2)} GHz`);
      });
      break;
    case '--homedir':
      console.log(os.homedir());
      break;
    case '--username':
      console.log(os.userInfo().username);
      break;
    case '--architecture':
      console.log(process.arch);
      break;
    default:
      console.log('Invalid input');
  }
}

async function calculateHash(filePath) {
  if (!filePath) throw new Error('No path provided');
  const fullPath = path.resolve(currentDir, filePath);
  const stream = fsSync.createReadStream(fullPath);
  const hash = crypto.createHash('sha256');
  stream.pipe(hash);
  const hashed = await new Promise((resolve) => {
    hash.on('finish', () => resolve(hash.digest('hex')));
  });
  console.log(hashed);
}

async function compressFile(filePath, destPath) {
  if (!filePath || !destPath) throw new Error('Missing arguments');
  const srcPath = path.resolve(currentDir, filePath);
  const dstPath = path.resolve(currentDir, destPath);
  const readStream = fsSync.createReadStream(srcPath);
  const writeStream = fsSync.createWriteStream(dstPath);
  const brotli = createBrotliCompress();
  readStream.pipe(brotli).pipe(writeStream);
  await new Promise(resolve => writeStream.on('finish', resolve));
}

async function decompressFile(filePath, destPath) {
  if (!filePath || !destPath) throw new Error('Missing arguments');
  const srcPath = path.resolve(currentDir, filePath);
  const dstPath = path.resolve(currentDir, destPath);
  const readStream = fsSync.createReadStream(srcPath);
  const writeStream = fsSync.createWriteStream(dstPath);
  const brotli = createBrotliDecompress();
  readStream.pipe(brotli).pipe(writeStream);
  await new Promise(resolve => writeStream.on('finish', resolve));
}

function exitProgram() {
  console.log(`Thank you for using File Manager, ${username}, goodbye!`);
  rl.close();
  process.exit(0);
}

process.on('SIGINT', exitProgram);

initialize();