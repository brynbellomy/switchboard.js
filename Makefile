
build: index.js

clean:
	@rm ./index.js

index.js:
	@coffee -c -o . src/index.coffee