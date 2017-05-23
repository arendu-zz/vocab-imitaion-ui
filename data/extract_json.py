#!/usr/bin/env python
__author__ = 'arenduchintala'
import sys
import pdb
import numpy as np
import codecs
import argparse
import json
sys.stdout = codecs.getwriter('utf-8')(sys.stdout)

class Question(dict):
    def __init__(self, d):
        super(Question, self).__init__()

    def to_json_str(self,):
        return json.dumps(self)

if __name__ == '__main__':
    opt= argparse.ArgumentParser(description="accepts a csv file and generates log linear features")
    #insert options here
    opt.add_argument('-v', action='store', dest='vocab_file', default='es-en-medium.vocab')
    options = opt.parse_args()
    data = codecs.open(options.vocab_file, 'r', 'utf8').readlines()
    max_line_idx = len(data) - 2
    data = [d.strip().split(',')[:] for d in data]
    categories = data[0]
    pair2questions = {}

    cat2pairs = {}
    pair2cats = {}
    pair2lem = {}
    cell2pairs = {}
    pair2cell = {}
    test_pairs = []
    pairs = []
    es2en = {}
    en2es = {}
    prev_test_line = -1

    for line_idx, line in enumerate(data[1:]):
        for phrase_idx, phrase_pairs in enumerate(line):
            es_str, en_str = phrase_pairs.strip().split('/')
            es_str = es_str.strip()
            en_str = en_str.strip()
            cats = data[0][phrase_idx].split()
            es2en[es_str] = en_str
            en2es[en_str] = es_str
            pair = (es_str, en_str)
            pairs.append(pair)

            pair2lem[pair] = line_idx

            cell2pairs[(line_idx, phrase_idx)] = pair
            pair2cell[pair] = (line_idx, phrase_idx)
            print line_idx, phrase_idx 
            if phrase_idx % 3 == line_idx:
                test_pairs.append(pair) 

            for cat in cats:
                cp_list = cat2pairs.get(cat, [])
                cp_list.append((es_str, en_str))
                cat2pairs[cat] = cp_list
                pc_list = pair2cats.get(pair, [])
                pc_list.append(cat)
                pair2cats[pair] = pc_list

    for p in pairs:
        print p, pair2cats[p], len(pair2cats[p])

    for p in pairs:
        pq = pair2questions.get(p, [])
        cats = pair2cats[p]
        p_row = pair2lem[p]
        for cat in cats:
            if p in test_pairs:
                confusers = [c[1] for c in cat2pairs[cat] if c != p]
                es_confusers = [en2es[c] for c in confusers]
                lemma_confusers = [c[1] for c in cat2pairs[cat] if (pair2lem[c] == p_row and c != p)]
                es_lemma_confusers = [en2es[c] for c in lemma_confusers]
            else:
                confusers = [c[1] for c in cat2pairs[cat] if (c != p and c not in test_pairs)]
                es_confusers = [en2es[c] for c in confusers]
                lemma_confusers = [c[1] for c in cat2pairs[cat] if (pair2lem[c] == p_row and c != p and c not in test_pairs)]
                es_lemma_confusers = [en2es[c] for c in lemma_confusers]
            assert len(confusers) > 0
            q = {'cats': cats, 'l2_str': p[0], 'l1_str': p[1], 'l2_confusers': es_confusers, 'l1_confusers': confusers, 'confusers_cats': [cat]}
            pq.append(q)
            if len(lemma_confusers) > 0:
                q_lem = {'cats': cats, 'l2_str': p[0], 'l1_str': p[1], 'l2_confusers': es_lemma_confusers, 'l1_confusers': lemma_confusers, 'confusers_cats': ['lem', cat]}
                pq.append(q_lem)
        pair2questions[p] = pq

    print cat2pairs.keys()
    main_cats = ['Simple-Present', 'Simple-Past', 'Simple-Future']
    full_group = {}
    for mc_idx, mc in enumerate(main_cats):
        dump_obj = {}
        for p in cat2pairs[mc]:
            o = {'cats': pair2cats[p],
                'isTest': p in test_pairs,
                'x': int(pair2cell[p][0]),
                'y': int(pair2cell[p][1]),
                'l1_str': p[1], 
                'l2_str': p[0],
                'lemcat': str(pair2lem[p]) + ',' + ','.join(pair2cats[p]),
                'questions': pair2questions[p]}
            xo = dump_obj.get(o['x'], [])
            xo.append(o)
            dump_obj[o['x']] = xo
        full_group[mc_idx + 1] = dump_obj
    dump_file = codecs.open(options.vocab_file + '.questions.js', 'w', 'utf8')
    dump_str = json.dumps(full_group, indent=4, sort_keys=True)
    dump_file.write(dump_str)
    dump_file.flush()
    dump_file.close()
