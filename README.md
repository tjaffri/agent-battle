# Agent Battle

A multi-LLM debate application where GPT-4o and Gemini 2.0 engage in iterative debates, critiquing each other's responses in real-time.

![Agent Battle Screenshot](https://via.placeholder.com/800x400?text=Agent+Battle+Screenshot)

## Features

- **Dual AI Debate**: Watch GPT-4o and Gemini 2.0 respond simultaneously to your questions
- **Iterative Critiques**: Each AI critiques the other's response in successive rounds
- **Real-time Streaming**: Responses stream via Server-Sent Events (SSE)
- **Modern UI**: Clean, professional interface inspired by UiPath's Apollo design system
- **LangSmith Tracing**: Full observability into LLM calls and debate flow

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│           React + TypeScript + Tailwind CSS                  │
│  ┌─────────────────┐     ┌─────────────────┐                │
│  │   GPT-4o Chat   │     │  Gemini Chat    │                │
│  │     Window      │     │    Window       │                │
│  └─────────────────┘     └─────────────────┘                │
│            ↑ SSE (Server-Sent Events) ↑                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Debate Engine                       │    │
│  │  ┌──────────┐                    ┌──────────────┐   │    │
│  │  │  GPT-4o  │←── Cross-Post ───→│  Gemini 2.0  │   │    │
│  │  │  (OpenAI)│    Critiques      │   (Google)   │   │    │
│  │  └──────────┘                    └──────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                    ↓ LangSmith Tracing ↓                     │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend
- **FastAPI** - High-performance async Python web framework
- **LangChain** - LLM orchestration and abstraction
- **SSE-Starlette** - Server-Sent Events for real-time streaming
- **Pydantic** - Data validation and settings management
- **LangSmith** - LLM observability and tracing

### Frontend
- **React 18** - UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components

### Testing & CI
- **pytest** - Python testing framework
- **Vitest** - Fast unit testing for Vite projects
- **GitHub Actions** - Automated CI/CD pipelines

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- OpenAI API key
- Google AI API key (for Gemini)
- LangSmith API key (optional, for tracing)

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/tjaffri/agent-battle.git
   cd agent-battle
   ```

2. Copy the environment template:
   ```bash
   cp .env.example backend/.env
   ```

3. Add your API keys to `backend/.env`:
   ```env
   OPENAI_API_KEY=sk-...
   GOOGLE_API_KEY=...
   LANGSMITH_API_KEY=lsv2_...  # Optional
   ```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Run the server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
```

The UI will be available at `http://localhost:5173`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/debate/start` | POST | Start a new debate session |
| `/debate/{session_id}/stream` | GET | SSE stream for debate responses |
| `/debate/{session_id}/stop` | POST | Stop an active debate |

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm run test
```

### Linting & Formatting

```bash
# Backend
cd backend
black app/ tests/
ruff check app/ tests/

# Frontend
cd frontend
npm run lint
npm run format
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build
```

## Project Structure

```
agent-battle/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application
│   │   ├── graph.py         # Debate engine logic
│   │   ├── models.py        # Pydantic models
│   │   └── config.py        # Settings management
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── .github/
│   └── workflows/           # CI/CD pipelines
└── README.md
```

## CI/CD

GitHub Actions workflows automatically run on PRs:

- **Backend CI**: Black formatting, Ruff linting, pytest tests
- **Frontend CI**: ESLint, Prettier, Vitest tests, build verification

## License

MIT

## Acknowledgments

- Built with [LangChain](https://langchain.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Design inspired by [UiPath Apollo Design System](https://www.uipath.com/blog/product-and-updates/introducing-new-design-system-apollo)
# test
