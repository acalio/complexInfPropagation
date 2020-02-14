from api.utilities.diffusion_model import DiffusionModel, ThresholdFunction, QuiescentFunction, FixedProbability

import random as r


class SPDLT(DiffusionModel):
    QUIESCENT = -1
    INACTIVE = 0
    FIRST_CAMPAIGN = 1
    SECOND_CAMPAIGN = 2

    STATE_MAP = {
        -1: 'quiescent',
         0: 'inactive',
        1: 'active',
        2: 'comp'
    }

    def __init__(self, _g, _tb_rule=FixedProbability(0.5), _t_function= ThresholdFunction(0.1), _q_function=QuiescentFunction(1)):
        super(SPDLT, self).__init__(_g)
        self.active = {
            SPDLT.FIRST_CAMPAIGN: set(),
            SPDLT.SECOND_CAMPAIGN: set()
        }

        self.activation_state = {x: SPDLT.INACTIVE for x in self.g}  # [SPDLT.INACTIVE] * len(self.g)
        self.taus = {x: 0 for x in self.g}
        self.active = {1: set(), 2:set()}
        self.thresholds = {x: 0 for x in self.g}
        self._tb_rule = _tb_rule
        self.t_function = _t_function
        self.q_function = _q_function
        self.seed = set()

    def start(self):
        for v in self.g:
            self.thresholds[v] = r.random()
            self.taus[v] = r.randint(0, 5)
        assert (len(self.thresholds) == len(self.g))

    def set_seed_set(self, seeds, campaign=1):
        if campaign > 2:
            raise RuntimeError
        for v in seeds:
            print(self.active)
            self.active[campaign].add(v)
            self.activation_state[v] = campaign
            self.seed.add(v)

    def get_active_nodes(self, campaign=1):
        if campaign > 2:
            raise RuntimeError
        return self.active[campaign]

    def run(self):
        self.start()
        quiescent_nodes = {}
        switch_nodes, transitions = [], []
        switch = 0
        activation_time = {x: 0 for x in self.g}
        t = 0
        while t <= 100:
            transitions += [[]]
            trans_list = transitions[-1]

            for v in self.g:
                print(v)
                previous_state = self.activation_state[v]
                if previous_state == SPDLT.QUIESCENT or v in self.seed:
                    continue

                inf_first, inf_second = self.get_influence(v)
                theta = self.compute_threshold(v, activation_time[v], t)

                if previous_state == SPDLT.INACTIVE:
                    if inf_second >= theta and inf_first >= theta:
                        # tie breaking rule
                        c = self._tb_rule()
                        next_state = SPDLT.FIRST_CAMPAIGN if c == 0 else SPDLT.SECOND_CAMPAIGN
                    elif inf_first >= theta:
                        next_state = SPDLT.FIRST_CAMPAIGN
                    elif inf_second >= theta:
                        next_state = SPDLT.SECOND_CAMPAIGN
                    else:
                        continue

                elif previous_state == SPDLT.FIRST_CAMPAIGN and inf_second >= theta and inf_second > inf_first:
                    next_state = SPDLT.SECOND_CAMPAIGN
                elif previous_state == SPDLT.SECOND_CAMPAIGN and inf_first >= theta and inf_first > inf_second:
                    next_state = SPDLT.FIRST_CAMPAIGN
                else:
                    continue

                if previous_state != next_state:
                    if previous_state == SPDLT.INACTIVE:
                        # nuova attivazione
                        self.activation_state[v] = SPDLT.QUIESCENT
                        neg_inf = self.get_negative_influence(v, next_state)
                        q = self.compute_quiescent_time(v, neg_inf)
                        if int(t + q) not in quiescent_nodes:
                            quiescent_nodes[int(t + q)] = []
                        quiescent_nodes[int(t + q)] += [(v, next_state)]
                        trans_list.append(self.transition(v, previous_state, SPDLT.QUIESCENT))
                        assert (t + q > t)
                    else:
                        # switch
                        switch += 1
                        switch_nodes += [(v, previous_state, next_state)]
                        trans_list.append(self.transition(v, previous_state, next_state))

            # eseguo gli switch
            for u, p, n in switch_nodes:
                self.active[p].remove(u)
                self.active[n].add(u)
                self.activation_state[u] = n
                activation_time[u] = t + 1

            if quiescent_nodes:
                t = min(quiescent_nodes.keys())
            else:
                break

            for u, c in quiescent_nodes[t]:
                self.activation_state[u] = c
                self.active[c].add(u)
                activation_time[u] = t
                trans_list.append(self.transition(u, SPDLT.QUIESCENT, c))

            del quiescent_nodes[t]
            del switch_nodes[:]

        return transitions

    def get_influence(self, v):
        first_campaign_inf, second_campaign_inf = 0, 0
        for src, trg, e in self.g.in_edges(v, data=True):
            if e['weight'] > 0:
                if self.activation_state[src] == SPDLT.FIRST_CAMPAIGN:
                    first_campaign_inf += e['weight']
                elif self.activation_state[src] == SPDLT.SECOND_CAMPAIGN:
                    second_campaign_inf += e['weight']

        return first_campaign_inf, second_campaign_inf

    def get_negative_influence(self, v, campaign):
        inf = 0
        for src, trg, e in self.g.in_edges(v, data=True):
            if e['weight'] < 0:
                if self.activation_state[src] == campaign:
                    inf -= e['weight']

        return inf

    def compute_threshold(self, v, act_time, curr_time):
        if self.activation_state[v] == SPDLT.INACTIVE:
            act_time = -1
        delta = self.t_function(current_time=curr_time, activation_time=act_time)
        delta += self.thresholds[v]
        return delta if delta <= 1 else 1

    def compute_quiescent_time(self, v, neg_inf):
        return self.taus[v] + self.q_function(negative_influence=neg_inf) + 1

    def transition(self, u, prev, next):
        return [u, SPDLT.STATE_MAP[prev], SPDLT.STATE_MAP[next]]

