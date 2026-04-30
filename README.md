# HC AI Playground

A feature-complete AI testing playground for Hack Club members. Test 30+ AI models with your Hack Club API key.

## Features

- **Multimodal Chat**: Chat with various LLMs (GPT, Gemini, etc.)
- **Image Generation**: Create images using state-of-the-art models.
- **Speech**: Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities.
- **Music Generation**: Generate music from text prompts.
- **Embeddings**: Compare and analyze text embeddings.
- **Utilities**: Various AI-powered utility tools.
- **BYOK (Bring Your Own Key)**: Securely use your own Hack Club API key.

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Backend**: [Convex](https://www.convex.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js installed
- A [Convex](https://www.convex.dev/) account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/danielzanthosh/hackclub-ai-playground.git
   cd hc-ai-playground
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Convex deployment details:
   ```env
   CONVEX_DEPLOYMENT=...
   NEXT_PUBLIC_CONVEX_URL=...
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Run Convex:
   ```bash
   npx convex dev
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Made with ❤️ by [Grace Site](gracesite.vercel.app) & [Daniel Santhosh](https://github.com/danielsanthosh).
