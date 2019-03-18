import random as r
from numpy import exp

class TieBreakingRule(object):

    def __call__(self, *args, **kwargs):
        raise NotImplementedError


class FixedProbability(TieBreakingRule):

    def __init__(self, _p):
        self.p = _p

    def __call__(self, *args, **kwargs):
        sample = r.random()
        if sample < self.p:
            return 0
        else:
            return 1


class Function(object):

    def __call__(self, *args, **kwargs):
        raise NotImplementedError


class ThresholdFunction(Function):

    def __init__(self, _delta):
        self.delta = _delta

    def __call__(self, *args, **kwargs):
        current_time = kwargs['current_time']
        activation_time = kwargs['activation_time']
        return self.delta * (current_time - activation_time) if activation_time != -1 else 0


class QuiescentFunction(Function):

    def __init__(self, _lam=1):
        self.lam = _lam

    def __call__(self, *args, **kwargs):
        neg_inf = kwargs['negative_influence']
        return exp(self.lam*neg_inf)


class DiffusionModel(object):

    def __init__(self, _g):
        self.g = _g  # grafo di diffusione

    def start(self):
        raise NotImplementedError

    def set_seed_set(self, seeds, campaign=1):
        raise NotImplementedError

    def run(self):
        raise NotImplementedError

    def get_active_nodes(self, campaign=1):
        raise NotImplementedError

    def reset(self):
        pass