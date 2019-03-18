from flask import (
    Blueprint, flash, g, redirect, render_template, request, url_for, jsonify
)
from werkzeug.exceptions import abort
from utilities import network_factory as nf
from utilities.ncfdlt_model import NCFDLT
from utilities.diffusion_model import  QuiescentFunction

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
    G = nf.convertedgelist2digraph(edges)
    model = NCFDLT(G, QuiescentFunction())
    model.set_seed_set(active_nodes)
    transitions = model.run()
    return jsonify(transitions)

@db.route('/about', methods=('GET',))
def about():
    return render_template('about.html')
