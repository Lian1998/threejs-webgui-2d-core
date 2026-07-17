
# AGENTS.md

## Project Overview

This project is a Three.js-based WebGUI rendering framework for industrial equipment monitoring. It is built with Vite and uses Three.js in offline `lib` mode.

The goal is to build a reusable 3D rendering framework whose core capabilities can eventually be packaged as a library for different business projects.

Directory responsibilities:

* `/core`: Core framework source code, including reusable rendering, interaction, resource management, lifecycle handling, utilities, and public APIs.
* `/multi-pages`: Vite multi-page test entries used to verify core modules and rendering capabilities.
* `/source`: Simulated business application code used to validate how real projects consume `/core`, including API usability and extensibility.

## Code Style

Only Prettier is used for formatting. Do not introduce additional formatters or lint rules.

Requirements:

* Do not make unnecessary large-scale changes to existing comments.
* Use `UTF-8 without BOM` for all files.

## Testing

After each requested change, perform only the most basic and relevant validation.

## Modification Scope

Limit changes to the explicit scope of the current request. If no scope is specified, use the smallest reasonable modification.

## Clarification

Ask for confirmation before making changes involving complex architecture, public API design, multi-module coordination, compatibility risks, or clear ambiguity.

For small and well-scoped tasks, proceed directly using the minimum-change principle.

## Comments

Add necessary Chinese comments for complex algorithms, key rendering flows, and lifecycle logic.

Comments should explain why something is done, not simply repeat the code. Do not delete or heavily rewrite existing comments unless they are clearly wrong or outdated.
