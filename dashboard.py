from flask import (
    Blueprint, flash, g, redirect, render_template, request, url_for, jsonify
)
from werkzeug.exceptions import abort
from utilities import network_factory as nf

db = Blueprint('main', __name__)


@db.route('/', methods=('GET', 'POST'))
def index():
    if request.method == 'POST':
        n = int(request.form['N'])
        e = int(request.form['E'])
        error = None
        try:
            G = nf.create_network(n, e)
        except nf.nx.NetworkXError:
            error = "Wrong input paramater"

        if error is not None:
            flash(error)
        else:
            render_template('index.html', G=jsonify(G))

    return render_template('index.html')


@db.route('/getNetwork/<int:n>/<int:e>', methods=('GET',))
def getNetwork(n, e):
    G = nf.create_network(n, e)
    return jsonify(G)

@db.route('/run', methods=('POST',))
def run():
    request_json = request.get_json()
    active_nodes, edges = request_json['active'], request_json['edges']
    print(active_nodes, edges)
    result = [
        [[2,'quiescent'],[3, 'quiescent']],
        [[4,'inactive'],[5, 'quiescent']],
        [[10,'active'], [20, 'quiescent']],
        [[12,'active'],[11, 'quiescent'], [20, 'quiescent']],
        [[6,'active'], [7, 'quiescent']]
    ]
    return jsonify(result)

@db.route('/about', methods=('GET',))
def about():
    return render_template('about.html')
