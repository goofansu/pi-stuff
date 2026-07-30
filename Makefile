.PHONY: install symlink skills

install: symlink
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent

symlink:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json
	@ln -svf $(CURDIR)/agent/AGENTS.md ~/.pi/agent/AGENTS.md

skills:
	npx skills add ./skills -a claude-code -g -y
	# Install skills for autonomous Claude Code workflows.
	npx skills add mattpocock/skills -a claude-code -g -y \
		-s triage \
		-s implement \
		-s tdd \
		-s code-review
	# Install skills for interactive Pi sessions that capture human decisions as artifacts for autonomous agents.
	npx skills add mattpocock/skills -a pi -g -y \
		-s setup-matt-pocock-skills \
		-s writing-great-skills \
		-s improve-codebase-architecture \
		-s codebase-design \
		-s grill-with-docs \
		-s grilling \
		-s domain-modeling \
		-s wayfinder \
		-s prototype \
		-s research \
		-s to-spec \
		-s to-tickets
