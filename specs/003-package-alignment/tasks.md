# Tasks

- [x] Read the supplied package diagram and compare it with current code and instructions.
- [x] Move production and test classes to the document's root and layer packages; update imports.
- [x] Align AGENTS.md, CLAUDE.md, and architecture documentation; distinguish planned features.
- [x] Check package references and record the compilation attempt and environmental limitation.

Validation: production/test package declarations and imports use `com.happyprogramming`; old Java source files were moved. `mvn -o -DskipTests test-compile` was attempted but stopped before compilation: the cached Spring Boot 3.5.6 parent POM belongs to a repository ID unavailable in the current offline build context. Compilation and runtime tests remain unverified; rerun `mvn test-compile` when Maven dependencies can resolve. No frontend or database change was made.
