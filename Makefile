.PHONY: help install build watch clean test typecheck lint format format-check package all

help:
	@echo "Available targets:"
	@echo "  make install       - Install dependencies"
	@echo "  make format        - Format code with Biome"
	@echo "  make format-check  - Check code formatting without modifying files"
	@echo "  make lint          - Run ESLint"
	@echo "  make typecheck     - Run TypeScript type checking"
	@echo "  make build         - Build the extension"
	@echo "  make watch         - Watch and rebuild on changes"
	@echo "  make test          - Run tests"
	@echo "  make package       - Create .vsix package"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make all           - Run format-check, lint, typecheck, and build"

install:
	npm install

format:
	npx biome format --write .

format-check:
	npx biome format .

lint:
	npm run lint

typecheck:
	npm run check-types

build:
	npm run compile

watch:
	npm run watch

test:
	npm test

package: clean all
	npx vsce package

clean:
	rm -rf dist/
	rm -f *.vsix

all: format-check lint typecheck build
