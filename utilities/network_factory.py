import networkx as nx
from flask import jsonify


def convert_to_dict(G):
    Gdict = {}
    Gdict['directed'] = nx.is_directed(G)
    Gdict['multigraph'] = type(G) in [nx.MultiDiGraph, nx.MultiGraph]
    Gdict['nodes'] = [{'id': v} for v in G.nodes]
    Gdict['links'] = [{'source': u, 'target': v, "weight":1 } for u,v in G.edges]
    return Gdict

def create_network(nodes, edges, model="barabasi"):
    def __barabasi():
        return nx.barabasi_albert_graph(nodes, edges)

    G = {
        'barabasi': __barabasi
    }[model]()


    return convert_to_dict(G)



