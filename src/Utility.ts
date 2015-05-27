
export function doForAll(times : number, action : (i : number, done : () => void) => void, allDone : () => void) {
	var dones = 0;
	for (var i = 0; i < times; ++i) {
		action(i, () => {
			dones += 1;
			if (dones == times)
				allDone();
		});
	}
}
