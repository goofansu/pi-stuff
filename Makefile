.PHONY: skills

install: keybindings
	pi install .
	pi install https://github.com/goofansu/pi-remote-control
	pi install https://github.com/goofansu/pi-subagent
	pi install https://github.com/obra/superpowers

keybindings:
	@ln -svf $(CURDIR)/keybindings.json ~/.pi/agent/keybindings.json

skills:
	@gh skill install --dir skills --agent pi -f mattpocock/skills grill-with-docs
	@gh skill install --dir skills --agent pi -f mattpocock/skills grilling
	@gh skill install --dir skills --agent pi -f mattpocock/skills domain-modeling
	@gh skill install --dir skills --agent pi -f mattpocock/skills codebase-design
