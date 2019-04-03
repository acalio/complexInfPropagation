import networkx as nx
from flask import jsonify


def convert2dict(G):
    Gdict = {}
    Gdict['directed'] = nx.is_directed(G)
    Gdict['multigraph'] = type(G) in [nx.MultiDiGraph, nx.MultiGraph]
    Gdict['nodes'] = [{'id': v} for v in G.nodes]
    Gdict['links'] = [{'source': u, 'target': v, "weight": e['weight']} for u, v, e in G.edges(data=True)]
    return Gdict


def convert2digraph(G):
    if nx.is_directed(G):
        return G
    G_ = nx.DiGraph()
    for u, v in G.edges:
        if G.degree(u) >= G.degree(v):
            G_.add_edge(u, v, weight=1.0)
        else:
            G_.add_edge(v, u, weight=1.0)
    return G_


def convertedgelist2digraph(edgelist):
    G = nx.DiGraph()
    G.add_weighted_edges_from(edgelist)
    return G


def add_LT_weight(G):
    for u, v in G.edges:
        G[u][v]['weight'] = 1 / G.in_degree(v)


def create_network(nodes, edges, model=0):
    def __barabasi():
        return convert2digraph(nx.barabasi_albert_graph(nodes, int(edges / nodes)))
    def __random_graph():
        max_edges = nodes*(nodes-1)*0.5
        return convert2digraph(nx.erdos_renyi_graph(nodes, edges/max_edges))
    def __ws():
        return convert2digraph(nx.watts_strogatz_graph(nodes, int(edges/nodes), 0.5))
    G = {
        0 : __barabasi,
        1 : __random_graph,
        2 : __ws
    }[model]()
    add_LT_weight(G)
    return convert2dict(G)
