const { MainController } = require("./main-controller")
const { MainViewBuilder } = require("./main-view")
const MainView = MainViewBuilder()
const mainController = new MainController(BackgroundController);
mainController.run();

document.getElementById('update-download').addEventListener('click', () => {
    require('electron').ipcRenderer.send('download-update')
});

document.getElementById('update-restart').addEventListener('click', () => {
    require('electron').ipcRenderer.send('install-update')
});

require('electron').ipcRenderer.on('update-available', (event, info) => {
    console.log('Update available')
    console.log('Version', info.version)
    console.log('Release date', info.releaseDate)
    document.getElementById('update-strip').style.display = 'block';
})

require('electron').ipcRenderer.on('update-downloaded', () => {
    document.getElementById('update-strip').style.display = 'block';
    document.getElementById('update-available').style.display = 'none';
    document.getElementById('update-downloading').style.display = 'none';
    document.getElementById('update-downloaded').style.display = 'block';
})

require('electron').ipcRenderer.on('update-downloading', () => {
    document.getElementById('update-strip').style.display = 'block';
    document.getElementById('update-available').style.display = 'none';
    document.getElementById('update-downloaded').style.display = 'none';
    document.getElementById('update-downloading').style.display = 'block';
})

require('electron').ipcRenderer.on('update-download-progress', (event, args) => {

    updateProgress(args, "update-progress")
})


async function onInvoke(arguments)
{
	if (!arguments.length)
		return

	for (var i = 0; i < arguments.length; ++i) {
		if (arguments[i].indexOf('livelog=') !== -1) {
			var desc = arguments[i].substr(8, arguments[i].length)
			if (desc.length <= 0)
                continue
            mainController.mainView.liveLoggingAutoStartDescription = desc
            await mainController.mainView.liveLogLinkClicked(null);
            mainController.mainView.goButtonClicked();
		}
	}
}

require('electron').ipcRenderer.on('is-cli', async (event, args) => {
    await onInvoke(args)
})
