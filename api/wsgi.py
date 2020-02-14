from api import create_app
app = create_app()

app.config['UPLOAD_FOLDER'] = './.upload/'
