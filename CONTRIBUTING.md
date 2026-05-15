# Contributing to Edvanta

First off, thank you for considering contributing to Edvanta! It's people like you that make Edvanta a great tool for learners everywhere.

## 🌈 Code of Conduct

By participating in this project, you agree to abide by our code of conduct: be respectful, be inclusive, and be constructive.

## 🚀 How Can I Contribute?

### Reporting Bugs
- Check the [Issues](https://github.com/tanish-jain-225/edvanta/issues) page to see if the bug has already been reported.
- If not, open a new issue. Include a clear title, a description of the problem, and steps to reproduce.

### Suggesting Enhancements
- Open an issue with the "enhancement" label.
- Explain why this feature would be useful and how it should work.

### Pull Requests
1. **Fork** the repo and create your branch from `main`.
2. **Setup** the environment following the [SETUP.md](docs/SETUP.md).
3. **Make** your changes.
4. **Test** your changes (both frontend and backend).
5. **Lint** your code (`npm run lint` for client).
6. **Submit** a PR with a clear description of what you've done.

---

## 🎨 Style Guidelines

### Git Commit Messages
- Use the present tense ("Add feature" not "Added feature").
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...").
- Reference issues and pull requests liberally after the first line.

### Frontend (React)
- Follow standard React hooks patterns.
- Use Tailwind CSS for all styling.
- Ensure components are responsive and accessible.
- Use the `edvantaAPI` client for all network requests.

### Backend (Flask)
- Follow PEP 8 style guide.
- Use type hints for function arguments and return values where helpful.
- Ensure all new endpoints have corresponding health checks or tests.

---

## 🧪 Testing Requirements

- **New Features**: Must include unit tests for core logic.
- **Bug Fixes**: Should include a regression test.
- **UI Components**: Should include a basic rendering test in Vitest.

---

## 🗺️ Project Structure

```
edvanta/
├── client/     # React + Vite Frontend
├── server/     # Flask Backend
├── docs/       # Documentation
└── .github/    # CI/CD Workflows
```

Happy coding! 🚀
