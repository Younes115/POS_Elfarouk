New-Item -ItemType Directory -Force -Path src/renderer, src/main/prisma, docs, tests
Get-ChildItem -Path src -Exclude renderer,main | Move-Item -Destination src/renderer

npm install
npm install electron electron-builder concurrently cross-env wait-on --save-dev
npm install prisma --save-dev
npm install @prisma/client
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install clsx tailwind-merge lucide-react
