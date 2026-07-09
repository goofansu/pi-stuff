.PHONY: skills

install: keybindings
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/obra/superpowers

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

skills:
	@gh skill install vercel-labs/skills find-skills    --dir skills --agent pi
	@gh skill install mattpocock/skills grilling        --dir skills --agent pi
	@gh skill install mattpocock/skills grill-with-docs --dir skills --agent pi
	@gh skill install mattpocock/skills domain-modeling --dir skills --agent pi
	@gh skill install mattpocock/skills codebase-design --dir skills --agent pi
