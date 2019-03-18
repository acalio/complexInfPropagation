from utilities.diffusion_model import  DiffusionModel
import random as r
import heapq as q
from collections import deque


class NCFDLT(DiffusionModel):
    QUIESCENT, INACTIVE, ACTIVE = -1, 0, 1

    STATE_MAP = {-1: 'quiescent', 0: 'inactive', 1: 'active'}

    def __init__(self, _g, _q_function):
        super(NCFDLT, self).__init__(_g)
        self.thresholds, self.taus = {}, {}
        self.activation_state = {v: NCFDLT.INACTIVE for v in self.g}
        self.q_function = _q_function
        self.seeds = set()

    def start(self):
        for v in self.g:
            self.thresholds[v] = r.random()
            self.taus[v] = r.randint(0, 5)
        assert (len(self.thresholds) == len(self.g))

    def set_seed_set(self, seeds, campaign=1):
        self.seeds.clear()
        for v in seeds:
            self.seeds.add(v)
            self.activation_state[v] = NCFDLT.ACTIVE

    def get_active_nodes(self, campaign=1):
        return {k for k, v in self.activation_state.items() if v == NCFDLT.ACTIVE}

    def run(self):
        self.start()
        transitions = []
        influence_dict = {v: 0 for v in self.g}
        newly_activated = deque([v for v in self.seeds])
        quiescent_nodes = []
        pt, ct = 0, 0  # previous and current time step
        while newly_activated:
            iteration = [newly_activated.pop() for _ in range(len(newly_activated))]
            transitions += [[]]
            trans_list = transitions[-1]
            for v in iteration:
                for u, e in self.g[v].items():
                    w = e['weight']
                    if w > 0 and self.activation_state[u] == NCFDLT.INACTIVE:
                        influence_dict[u] += e['weight']
                        if influence_dict[u] >= self.thresholds[u]:
                            trans_list.append([u, NCFDLT.STATE_MAP[NCFDLT.INACTIVE], NCFDLT.STATE_MAP[NCFDLT.QUIESCENT]])
                            neg_inf = self.__get_negative_influence(u)
                            qt = self.__get_quiescent_time(u, neg_inf)
                            self.activation_state[u] = NCFDLT.QUIESCENT
                            q.heappush(quiescent_nodes, (ct+qt, u))

            # iteration ended
            try:
                t_, u = q.heappop(quiescent_nodes)
                pt = ct
                ct = t_
                newly_activated += [u]
                self.activation_state[u] = NCFDLT.ACTIVE
                trans_list.append([u, NCFDLT.STATE_MAP[NCFDLT.QUIESCENT], NCFDLT.STATE_MAP[NCFDLT.ACTIVE]])
                while True:
                    t_, u = q.heappop(quiescent_nodes)
                    if t_==ct:
                        self.activation_state[u] = NCFDLT.ACTIVE
                        newly_activated += [u]
                        trans_list.append([u, NCFDLT.STATE_MAP[NCFDLT.QUIESCENT], NCFDLT.STATE_MAP[NCFDLT.ACTIVE]])
                    else:
                        q.heappush(quiescent_nodes, (t_, u))
                        break
            except IndexError:
                pass
        print(transitions)
        return transitions

    def __get_quiescent_time(self, v, neg_inf):
        return int(self.taus[v] + self.q_function(negative_influence=neg_inf) + 1)

    def __get_negative_influence(self, v):
        inf = 0
        for src, trg, e in self.g.in_edges(v, data=True):
            if e['weight'] < 0:
                inf -= e['weight']
        return inf
